import { JovoCliPlugin, JovoCliPluginType } from 'jovo-cli-core';
import { New } from './commands';

export * from './commands';

export class NewCommand extends JovoCliPlugin {
  id: string = 'new';
  type: JovoCliPluginType = 'command';

  getCommands() {
    return [New];
  }
}

export default NewCommand;
