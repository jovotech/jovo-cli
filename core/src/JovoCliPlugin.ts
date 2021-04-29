import _merge from 'lodash.merge';
import { JovoCli } from '.';

import { Emitter } from './EventEmitter';
import { PluginCommand } from './PluginCommand';
import { PluginComponent } from './PluginComponent';
import { PluginHook } from './PluginHook';
import { PluginConfig, PluginContext, PluginType } from './utils';

export abstract class JovoCliPlugin {
  abstract readonly $type: PluginType;
  abstract readonly $id: string;

  $config: PluginConfig;
  $cli!: JovoCli;

  constructor(config?: PluginConfig) {
    this.$config = _merge(this.getDefaultConfig(), config);
  }

  getCommands(): typeof PluginCommand[] {
    return [];
  }

  getHooks(): typeof PluginHook[] {
    return [];
  }

  install(cli: JovoCli, emitter: Emitter): void {
    this.$cli = cli;
    for (const plugin of [...this.getCommands(), ...this.getHooks()]) {
      plugin.install(cli, this, emitter);
    }
  }

  setPluginContext(context: PluginContext): void {
    for (const plugin of [...this.getCommands(), ...this.getHooks()]) {
      ((plugin as unknown) as typeof PluginComponent).prototype['$context'] = context;
    }
  }

  getDefaultConfig(): PluginConfig {
    return {};
  }
}
