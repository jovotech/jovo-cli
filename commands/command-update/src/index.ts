import { JovoCliPlugin, PluginCommand, PluginType } from '@jovotech/cli-core';
import { Update } from './commands/update';

export * from './commands/update';

export class UpdateCommand extends JovoCliPlugin {
  id: string = 'run';
  type: PluginType = 'command';

  getCommands(): (typeof PluginCommand)[] {
    return [Update];
  }
}

export default UpdateCommand;
