import { JovoCliPlugin, PluginCommand, PluginType } from '@jovotech/cli-core';
import { Build } from './commands/build';

export * from './commands/build';

export class BuildCommand extends JovoCliPlugin {
  $id: string = 'build';
  $type: PluginType = 'command';

  getCommands(): typeof PluginCommand[] {
    return [Build];
  }
}

export default BuildCommand;
