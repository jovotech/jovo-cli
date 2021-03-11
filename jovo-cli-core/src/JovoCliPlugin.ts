import { JovoCliPluginConfig, JovoCliPluginType } from './utils';

export abstract class JovoCliPlugin {
  abstract type: JovoCliPluginType;
  abstract id: string;

  constructor(readonly config: JovoCliPluginConfig = {}) {}

  getCommands(): any[] {
    return [];
  }

  getHooks(): any[] {
    return [];
  }
}
