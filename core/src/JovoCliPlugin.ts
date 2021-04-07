import { PluginConfig, PluginType } from './utils';

export abstract class JovoCliPlugin {
  abstract type: PluginType;
  abstract id: string;

  constructor(readonly config: PluginConfig = {}) {}

  getCommands(): any[] {
    return [];
  }

  getHooks(): any[] {
    return [];
  }
}
