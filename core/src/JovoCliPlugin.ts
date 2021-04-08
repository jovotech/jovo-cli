import { Plugin } from './Plugin';
import { PluginConfig, PluginContext, PluginType } from './utils';

export abstract class JovoCliPlugin {
  abstract readonly type: PluginType;
  abstract readonly id: string;

  readonly config: PluginConfig;
  readonly supportedLocales: string[] = [];

  constructor(config: PluginConfig = {}) {
    this.config = config;
  }

  getCommands(): any[] {
    return [];
  }

  getHooks(): any[] {
    return [];
  }

  setPluginContext(context: PluginContext) {
    for (const plugin of [...this.getCommands(), ...this.getHooks()]) {
      (plugin as typeof Plugin).prototype['$context'] = context;
    }
  }
}
