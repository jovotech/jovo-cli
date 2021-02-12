import { JovoCliPlugin, JovoCliPluginType } from 'jovo-cli-core';
import { New } from './commands';

export * from './commands';

export default class JovoCliCommandNew extends JovoCliPlugin {
  type: JovoCliPluginType = 'command';

  getCommands() {
    return [New];
  }
}
