import { JovoCliPlugin, PluginType } from '@jovotech/cli-core';
import { BuildServerless } from './commands/build.serverless';
import { DeployHook } from './hooks/deploy.hook';
import { ServerlessConfig } from './utils/Interfaces';

export class ServerlessCli extends JovoCliPlugin {
  $id: string = 'serverless';
  $type: PluginType = 'target';

  constructor(config: ServerlessConfig) {
    super(config);
  }

  getCommands() {
    return [BuildServerless];
  }

  getHooks() {
    return [DeployHook];
  }

  getDefaultConfig(): ServerlessConfig {
    return {
      service: 'my-jovo-serverless-app',
      frameworkVersion: '2',
      package: {
        artifact: './bundle.zip',
      },
      provider: {
        name: 'aws',
        runtime: 'nodejs12.x',
      },
      functions: {
        handler: {
          handler: 'index.handler',
        },
      },
    };
  }
}
