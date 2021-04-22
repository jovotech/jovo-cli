import { JovoCliPlugin, PluginCommand, PluginType } from '@jovotech/cli-core';
import { Get } from './commands/get';

export * from './commands/get';

export class GetCommand extends JovoCliPlugin {
  $id: string = 'get';
  $type: PluginType = 'command';

  getCommands(): typeof PluginCommand[] {
    return [Get];
  }
}

export default GetCommand;
