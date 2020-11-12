import { JovoCliPlugin, JovoCliPluginType } from 'jovo-cli-core';
import { Run } from './commands';

export * from './commands';

export default class JovoCliCommandRun extends JovoCliPlugin {
  type: JovoCliPluginType = 'command';

  getCommands() {
    return [Run];
  }
}
