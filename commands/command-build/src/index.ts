import { JovoCliPlugin, PluginCommand, PluginType } from '@jovotech/cli-core';
import { Build } from './commands/build';

export * from './commands/build';

export class BuildCommand extends JovoCliPlugin {
  type: PluginType = 'command';
  id = 'build';

  getCommands(): typeof PluginCommand[] {
    return [Build];
  }
}

export default BuildCommand;
