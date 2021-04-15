import Command from '@oclif/command';
import * as Config from '@oclif/config';
import * as Parser from '@oclif/parser';
import { Mixin } from 'ts-mixer';

import { PluginComponent } from './PluginComponent';
import { Emitter } from './EventEmitter';
import { JovoCliError } from './JovoCliError';
import { ActionSet, DefaultEvents, Events, PluginConfig } from './utils/Interfaces';
import { JovoCliPlugin } from './JovoCliPlugin';

/**
 * Extends abstract Oclif Command class to mixin with PluginCommand.
 * * Workaround, since mixin() can't support abstract classes.
 */
class OclifCommand extends Command {
  static args: Parser.args.Input;

  run(): PromiseLike<unknown> {
    throw new Error('Method not implemented.');
  }
}

export abstract class PluginCommand<T extends Events = DefaultEvents> extends Mixin(
  PluginComponent,
  OclifCommand,
) {
  protected actionSet!: ActionSet<T | DefaultEvents>;
  protected $emitter!: Emitter<T | DefaultEvents>;

  /**
   * Loads command into CLI.
   * * Necessary for Oclif Framework.
   */
  static load(): typeof PluginCommand {
    return this;
  }

  /**
   * Initializes and installs the current command.
   * @param emitter - The commands EventEmitter.
   * @param config - The command plugins config.
   */
  static async install(
    plugin: JovoCliPlugin,
    emitter: Emitter,
    config: PluginConfig,
  ): Promise<Config.Command.Plugin> {
    super.install(plugin, emitter, config);

    return (this as unknown) as Config.Command.Plugin;
  }

  /**
   * Declare run() as abstract again.
   */
  abstract run(): Promise<unknown>;

  /**
   * Catch possible errors and print them.
   * @param error - JovoCliError.
   */
  async catch(error: JovoCliError): Promise<void> {
    this.error(`There was a problem:\n${error}`);
  }
}
