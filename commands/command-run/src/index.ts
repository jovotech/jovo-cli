import { JovoCliPlugin, PluginType } from '@jovotech/cli-core';
import { Run } from './commands/run';

export * from './commands/run';

export class RunCommand extends JovoCliPlugin {
  id: string = 'run';
  type: PluginType = 'command';

  getCommands() {
    return [Run];
  }
}

export default RunCommand;
