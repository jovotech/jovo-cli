import { JovoCliPlugin, PluginCommand, PluginType } from '@jovotech/cli-core';
import { New } from './commands/new';
import { NewStage } from './commands/new.stage';

export * from './commands/new';
export * from './commands/new.stage';

export class NewCommand extends JovoCliPlugin {
  id = 'new';
  type: PluginType = 'command';

  getCommands(): typeof PluginCommand[] {
    return [New, NewStage];
  }
}

export default NewCommand;
