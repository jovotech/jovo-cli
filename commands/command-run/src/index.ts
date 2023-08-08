import { JovoCliPlugin, PluginCommand, PluginType } from '@jovotech/cli-core';
import { Run } from './commands/run';

export * from './commands/run';

export class RunCommand extends JovoCliPlugin {
  id: string = 'run';
  type: PluginType = 'command';

  getCommands(): (typeof PluginCommand)[] {
    return [Run];
  }
}

export default RunCommand;
