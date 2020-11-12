import Command from '@oclif/command';
import * as Config from '@oclif/config';
import _get from 'lodash.get';

import { Emitter } from '.';
import { Project } from './Project';
import { DefaultEvents, Events, JovoCliConfigHooks, JovoCliPluginConfig } from './utils';

export abstract class BaseCommand<T extends Events = DefaultEvents> extends Command {
  $emitter?: Emitter<T & DefaultEvents>;
  $config?: JovoCliPluginConfig;

  /**
   * Loads command into CLI.
   * Necessary for Oclif Framework.
   */
  static load(): typeof BaseCommand {
    return this;
  }

  /**
   * Initializes and installs the current command.
   * @param emitter - The commands EventEmitter.
   * @param config - The command plugins config.
   */
  static async install(emitter: Emitter<Events>, config?: JovoCliPluginConfig): Promise<Config.Command.Plugin> {
    if (!this.prototype.$emitter) {
      this.prototype.$emitter = emitter;
    }

    if (config && !this.prototype.$config) {
      this.prototype.$config = config;
    }

    // Go through config, register hooks.
    const projectHooks: JovoCliConfigHooks = _get(config, 'options.hooks', {});
    for (const [event, fn] of Object.entries(projectHooks)) {
      // @ts-ignore
      emitter.on(event, fn);
    }

    await emitter.run('install', { command: this.id, flags: this.flags!, args: this.args! });

    return (this as any) as Config.Command.Plugin;
  }
}
