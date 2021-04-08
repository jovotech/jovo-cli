import Command from '@oclif/command';
import * as Config from '@oclif/config';
import _get from 'lodash.get';
import { Mixin } from 'ts-mixer';

import { Plugin } from './Plugin';
import { Emitter } from './EventEmitter';
import { JovoCliError } from './JovoCliError';
import { ActionSet, DefaultEvents, Events, PluginConfig } from './utils/Interfaces';
import { JovoCliPlugin } from './JovoCliPlugin';

/**
 * Extends abstract Oclif Command class to mixin with PluginCommand.
 * * Workaround, since mixin() can't support abstract classes.
 */
class OclifCommand extends Command {
  run(): PromiseLike<any> {
    throw new Error('Method not implemented.');
  }
}

export abstract class PluginCommand<T extends Events = DefaultEvents> extends Mixin(
  Plugin,
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

    return (this as any) as Config.Command.Plugin;
  }

  /**
   * Declare run() as abstract again.
   */
  abstract run(): Promise<any>;

  /**
   * Catch possible errors and print them.
   * @param error - JovoCliError.
   */
  async catch(error: JovoCliError) {
    this.error(`There was a problem:\n${error}`);
  }
}
