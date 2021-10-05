import { JovoCliPlugin, PluginCommand, PluginHook, PluginType } from '@jovotech/cli-core';
import { BuildServerless } from './commands/build.serverless';
import { DeployHook } from './hooks/DeployHook';
import { ServerlessConfig } from './interfaces';

export class ServerlessCli extends JovoCliPlugin {
  id: string = 'serverless';
  type: PluginType = 'target';

  constructor(config: ServerlessConfig) {
    super(config);
  }

  getCommands(): typeof PluginCommand[] {
    return [BuildServerless];
  }

  getHooks(): typeof PluginHook[] {
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
