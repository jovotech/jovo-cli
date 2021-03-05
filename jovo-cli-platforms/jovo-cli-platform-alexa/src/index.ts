import { JovoCliPlugin, JovoCliPluginType } from 'jovo-cli-core';
import { BuildHook, GetHook, DeployHook } from './hooks';

export default class AlexaCli extends JovoCliPlugin {
  type: JovoCliPluginType = 'platform';
  id: string = 'alexaSkill';

  getHooks() {
    return [BuildHook, GetHook, DeployHook];
  }
}
