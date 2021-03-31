import { JovoCliPlugin, JovoCliPluginType } from '@jovotech/cli-core';
import { Get } from './commands';

export * from './commands';

export class GetCommand extends JovoCliPlugin {
  type: JovoCliPluginType = 'command';
  id: string = 'get';

  getCommands() {
    return [Get];
  }
}

export default GetCommand;
