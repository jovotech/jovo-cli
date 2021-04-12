import { JovoCliPlugin, PluginType } from '@jovotech/cli-core';
import { New } from './commands/new';
import { NewStage } from './commands/new.stage';

export * from './commands/new';
export * from './commands/new.stage';

export class NewCommand extends JovoCliPlugin {
  id: string = 'new';
  type: PluginType = 'command';

  getCommands() {
    return [New, NewStage];
  }
}

export default NewCommand;
