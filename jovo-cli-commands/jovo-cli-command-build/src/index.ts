import { JovoCliPlugin, JovoCliPluginType } from '@jovotech/cli-core';
import { Build } from './commands';

export * from './commands';

export class BuildCommand extends JovoCliPlugin {
  type: JovoCliPluginType = 'command';
  id: string = 'build';

  getCommands() {
    return [Build];
  }
}

export default BuildCommand;
