import { JovoCliPlugin, PluginCommand, PluginType } from '@jovotech/cli-core';
import { DeployCode } from './commands/deploy.code';
import { DeployPlatform } from './commands/deploy.platform';

export * from './commands/deploy.code';
export * from './commands/deploy.platform';

export class DeployCommand extends JovoCliPlugin {
  id: string = 'deploy';
  type: PluginType = 'command';

  getCommands(): typeof PluginCommand[] {
    return [DeployCode, DeployPlatform];
  }
}

export default DeployCommand;
