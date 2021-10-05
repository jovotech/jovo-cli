import _merge from 'lodash.merge';
import { JovoCli } from '.';
import { EventEmitter } from './EventEmitter';
import { PluginConfig, PluginContext, PluginType } from './interfaces';
import { Log } from './Logger';
import { PluginCommand } from './PluginCommand';
import { PluginHook } from './PluginHook';

export abstract class JovoCliPlugin {
  abstract readonly type: PluginType;
  abstract readonly id: string;
  readonly config: PluginConfig;
  $cli!: JovoCli;

  constructor(config?: PluginConfig) {
    this.config = _merge(this.getDefaultConfig(), config);
  }

  getCommands(): typeof PluginCommand[] {
    return [];
  }

  getHooks(): typeof PluginHook[] {
    return [];
  }

  install(cli: JovoCli, emitter: EventEmitter, context: PluginContext): void {
    this.$cli = cli;
    for (const plugin of [...this.getCommands(), ...this.getHooks()]) {
      plugin.install(cli, this, emitter);
      plugin.prototype['$context'] = context;
    }
    Log.verbose(`Installed ${this.constructor.name}`, { indent: 2 });
  }

  getDefaultConfig(): PluginConfig {
    return {};
  }
}
