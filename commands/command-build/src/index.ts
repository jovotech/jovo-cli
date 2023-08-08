import { JovoCliPlugin, PluginCommand, PluginType } from '@jovotech/cli-core';
import { BuildPlatform } from './commands/build.platform';

export * from './commands/build.platform';

export class BuildCommand extends JovoCliPlugin {
  id: string = 'build';
  type: PluginType = 'command';

  getCommands(): (typeof PluginCommand)[] {
    return [BuildPlatform];
  }
}

export default BuildCommand;
