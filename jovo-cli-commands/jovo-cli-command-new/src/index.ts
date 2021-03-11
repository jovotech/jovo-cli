import { JovoCliPlugin, JovoCliPluginType } from 'jovo-cli-core';
import { New } from './commands';

export * from './commands';

export default class JovoCliCommandNew extends JovoCliPlugin {
  id: string = 'new';
  type: JovoCliPluginType = 'command';

  getCommands() {
    return [New];
  }
}
