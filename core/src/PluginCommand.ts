import Command, { flags } from '@oclif/command';
import * as Parser from '@oclif/parser';
import { Mixin } from 'ts-mixer';
import { Emitter } from './EventEmitter';
import { JovoCliError } from './JovoCliError';
import { PluginComponent } from './PluginComponent';
import { DefaultEvents, Events, MiddlewareCollection } from './utils';

/**
 * Extends abstract Oclif Command class to mixin with PluginCommand.
 * * Workaround, since mixin() can't support abstract classes.
 */
class OclifCommand extends Command {
  run(): PromiseLike<unknown> {
    throw new Error('Method not implemented.');
  }
}

export abstract class PluginCommand<T extends Events = DefaultEvents> extends Mixin(
  PluginComponent,
  OclifCommand,
) {
  protected middlewareCollection!: MiddlewareCollection<T | DefaultEvents>;
  protected $emitter!: Emitter<T | DefaultEvents>;

  static args: Parser.args.Input = [];
  static flags = {
    stage: flags.string({
      description: 'Takes configuration from specified stage.',
    }),
    debug: flags.boolean({
      description: 'Shows debugging information, such as the error trace stack.',
      parse(debug: boolean) {
        if (debug) {
          process.env.JOVO_CLI_LOG_LEVEL = 'DEBUG';
        }
      },
    }),
  };

  /**
   * Loads command into CLI.
   * * Necessary for Oclif Framework.
   */
  static load(): typeof PluginCommand {
    return this;
  }

  /**
   * Declare run() as abstract again.
   */
  abstract run(): Promise<unknown>;

  /**
   * Catch possible errors and print them.
   * @param error - JovoCliError.
   */
  async catch(error: JovoCliError | Error): Promise<void> {
    if (!(error instanceof JovoCliError)) {
      error = new JovoCliError(error.message);
    }
    JovoCliError.print(error as JovoCliError);
    process.exit(1);
  }
}
