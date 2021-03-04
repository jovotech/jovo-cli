import Command from '@oclif/command';
import * as Config from '@oclif/config';
import _get from 'lodash.get';
import { Mixin } from 'ts-mixer';

import { Emitter, JovoCliError } from '.';
import { EventHandler } from './EventHandler';
import { ActionSet, DefaultEvents, Events, JovoCliConfigHooks, JovoCliPluginConfig } from './utils';

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
  EventHandler,
  OclifCommand,
) {
  protected actionSet!: ActionSet<T & DefaultEvents>;
  protected $emitter!: Emitter<T & DefaultEvents>;
  protected $config!: JovoCliPluginConfig;

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
    emitter: Emitter<Events>,
    config: JovoCliPluginConfig,
  ): Promise<Config.Command.Plugin> {
    if (!this.prototype.$emitter) {
      this.prototype.$emitter = emitter;
    }

    if (!this.prototype.$config) {
      this.prototype.$config = config;
    }

    // Load action set.
    this.prototype.install();
    // Register events to emitter.
    this.prototype.loadActionSet();

    // Go through config, register hooks.
    const projectHooks: JovoCliConfigHooks = _get(config, 'options.hooks', {});
    for (const [event, fn] of Object.entries(projectHooks)) {
      // @ts-ignore
      emitter.on(event, fn);
    }

    // ToDo: Pull out, run from Collector.ts for only the needed plugin.
    // Run install event, so that commands can be enhanced before execution.
    await emitter.run('install', { command: this.id, flags: this.flags, args: this.args });

    return (this as any) as Config.Command.Plugin;
  }

  /**
   * Abstract install function to hook into events.
   */
  install() {}

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
