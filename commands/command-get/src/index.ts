import { JovoCliPlugin, PluginCommand, PluginType } from '@jovotech/cli-core';
import { Get } from './commands/get';

export * from './commands/get';

export class GetCommand extends JovoCliPlugin {
  type: PluginType = 'command';
  id = 'get';

  getCommands(): typeof PluginCommand[] {
    return [Get];
  }
}

export default GetCommand;
