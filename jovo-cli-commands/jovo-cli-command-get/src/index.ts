import { JovoCliPlugin, JovoCliPluginType } from 'jovo-cli-core';
import { Get } from './commands';

export * from './commands';

export default class JovoCliCommandBuild extends JovoCliPlugin {
  type: JovoCliPluginType = 'command';
  id: string = 'get';

  getCommands() {
    return [Get];
  }
}
