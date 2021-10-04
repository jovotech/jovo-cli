import Command, { flags } from '@oclif/command';
import * as Parser from '@oclif/parser';
import { Mixin } from 'ts-mixer';
import { EventEmitter } from './EventEmitter';
import { JovoCliError } from './JovoCliError';
import { PluginComponent } from './PluginComponent';
import { CliArgs, CliFlags, DefaultEvents, Events, MiddlewareCollection } from './interfaces';
import { ParserInput } from '@oclif/parser/lib/parse';

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
  middlewareCollection!: MiddlewareCollection<T | DefaultEvents>;
  $emitter!: EventEmitter<T | DefaultEvents>;

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
   * Overwrite parse()
   */
  parse<FLAGS>(
    command: Parser.Input<FLAGS> = this.constructor as unknown as Parser.Input<FLAGS>,
    argv?: string[],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Parser.Output<FLAGS, any> {
    const output = super.parse(command, argv);

    for (const arg of Object.keys(output.args)) {
      const commandArgument = command.args!.find((el) => el.name === arg)!;

      // TODO: Multiple as last argument?
      if (!commandArgument.multiple || command.args!.length > 1) {
        break;
      }

      const argValues: string[] = output.argv.filter((el) => !el.startsWith('-'));
      output.args[arg] = argValues;
    }

    return output;
  }
  /**
   * Catch possible errors and print them.
   * @param error - JovoCliError.
   */
  async catch(error: JovoCliError | Error): Promise<void> {
    if (!(error instanceof JovoCliError)) {
      error = new JovoCliError({ message: error.message });
    }
    JovoCliError.print(error as JovoCliError);
    process.exit(1);
  }
}
