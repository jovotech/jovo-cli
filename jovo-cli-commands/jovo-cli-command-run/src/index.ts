import { JovoCliPlugin, JovoCliPluginType } from '@jovotech/cli-core';
import { Run } from './commands';

export * from './commands';

export class RunCommand extends JovoCliPlugin {
  id: string = 'run';
  type: JovoCliPluginType = 'command';

  getCommands() {
    return [Run];
  }
}

export default RunCommand;
