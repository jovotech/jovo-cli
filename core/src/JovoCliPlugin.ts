import { Emitter } from './EventEmitter';
import { PluginCommand } from './PluginCommand';
import { PluginComponent } from './PluginComponent';
import { PluginHook } from './PluginHook';
import { PluginConfig, PluginContext, PluginType } from './utils';

export abstract class JovoCliPlugin {
  abstract readonly $type: PluginType;
  abstract readonly $id: string;

  $config: PluginConfig;

  constructor(config: PluginConfig = {}) {
    this.$config = config;
  }

  getCommands(): typeof PluginCommand[] {
    return [];
  }

  getHooks(): typeof PluginHook[] {
    return [];
  }

  install(emitter: Emitter): void {
    for (const plugin of [...this.getCommands(), ...this.getHooks()]) {
      plugin.install(this, emitter, this.$config);
    }
  }

  setPluginContext(context: PluginContext): void {
    for (const plugin of [...this.getCommands(), ...this.getHooks()]) {
      ((plugin as unknown) as typeof PluginComponent).prototype['$context'] = context;
    }
  }
}
