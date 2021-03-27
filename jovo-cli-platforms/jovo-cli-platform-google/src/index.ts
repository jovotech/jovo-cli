import { JovoCliPlugin, JovoCliPluginType } from 'jovo-cli-core';
import { BuildHook } from './hooks';

export class GoogleAssistantCli extends JovoCliPlugin {
  type: JovoCliPluginType = 'platform';
  id: string = 'googleAction';

  getHooks() {
    return [BuildHook];
  }
}
