import { JovoCliPlugin, JovoCliPluginType } from 'jovo-cli-core';
import { New } from './commands';
import { NewStage } from './commands/new:stage';

export * from './commands';

export class NewCommand extends JovoCliPlugin {
  id: string = 'new';
  type: JovoCliPluginType = 'command';

  getCommands() {
    return [New, NewStage];
  }
}

export default NewCommand;
