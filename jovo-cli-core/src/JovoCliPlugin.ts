import { JovoCliPluginConfig, JovoCliPluginType } from './utils';

export abstract class JovoCliPlugin {
  abstract type: JovoCliPluginType;
  // @ts-ignore
  id: string;

  get config() {
    return this._config;
  }

  constructor(private _config: JovoCliPluginConfig) {}

  getCommands(): any[] {
    return [];
  }

  getHooks(): any[] {
    return [];
  }
}
