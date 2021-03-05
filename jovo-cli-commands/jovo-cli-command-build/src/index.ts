import { JovoCliPlugin, JovoCliPluginType } from 'jovo-cli-core';
import { Build } from './commands';

export * from './commands';

export default class BuildCommand extends JovoCliPlugin {
  type: JovoCliPluginType = 'command';
  id: string = 'build';

  getCommands() {
    return [Build];
  }
}
