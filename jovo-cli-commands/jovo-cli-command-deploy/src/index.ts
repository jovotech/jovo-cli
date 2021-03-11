import { JovoCliPlugin, JovoCliPluginType } from 'jovo-cli-core';
import { Deploy, DeployCode, DeployPlatform } from './commands';

export * from './commands';

export default class JovoCliCommandDeploy extends JovoCliPlugin {
  id: string = 'deploy';
  type: JovoCliPluginType = 'command';

  getCommands() {
    return [Deploy, DeployCode, DeployPlatform];
  }
}
