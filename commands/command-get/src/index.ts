import { JovoCliPlugin, PluginCommand, PluginType } from '@jovotech/cli-core';
import { GetPlatform } from './commands/get.platform';

export * from './commands/get.platform';

export class GetCommand extends JovoCliPlugin {
  id: string = 'get';
  type: PluginType = 'command';

  getCommands(): (typeof PluginCommand)[] {
    return [GetPlatform];
  }
}

export default GetCommand;
