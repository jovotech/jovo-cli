import { JovoCliPlugin, JovoCliPluginType } from 'jovo-cli-core';
import { Deploy } from './commands/deploy';
import { DeployCode } from './commands/deploy.code';
import { DeployPlatform } from './commands/deploy.platform';

export * from './commands/deploy';
export * from './commands/deploy.code';
export * from './commands/deploy.platform';

export class DeployCommand extends JovoCliPlugin {
  id: string = 'deploy';
  type: JovoCliPluginType = 'command';

  getCommands() {
    return [Deploy, DeployCode, DeployPlatform];
  }
}

export default DeployCommand;
