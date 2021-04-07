import { JovoCliPlugin, PluginType } from '@jovotech/cli-core';
import { Build } from './commands';

export * from './commands';

export class BuildCommand extends JovoCliPlugin {
  type: PluginType = 'command';
  id: string = 'build';

  getCommands() {
    return [Build];
  }
}

export default BuildCommand;
