import { PluginCommand } from './PluginCommand';
import { PluginComponent } from './PluginComponent';
import { PluginHook } from './PluginHook';
import { PluginConfig, PluginContext, PluginType } from './utils';

export abstract class JovoCliPlugin {
  abstract readonly type: PluginType;
  abstract readonly id: string;

  readonly config: PluginConfig;
  readonly supportedLocales: string[] = [];

  constructor(config: PluginConfig = {}) {
    this.config = config;
  }

  getCommands(): typeof PluginCommand[] {
    return [];
  }

  getHooks(): typeof PluginHook[] {
    return [];
  }

  setPluginContext(context: PluginContext): void {
    for (const plugin of [...this.getCommands(), ...this.getHooks()]) {
      ((plugin as unknown) as typeof PluginComponent).prototype['$context'] = context;
    }
  }
}
