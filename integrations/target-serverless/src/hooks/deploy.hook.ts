import { execAsync, JovoCliError, PluginHook, ROCKET, Task } from '@jovotech/cli-core';
import { DeployCodeEvents, DeployCodeContext } from '@jovotech/cli-command-deploy';

import { getServerlessError, ServerlessConfig } from '../utils';

export class DeployHook extends PluginHook<DeployCodeEvents> {
  $config!: ServerlessConfig;
  $context!: DeployCodeContext;

  install() {
    this.middlewareCollection = {
      'before.deploy:code': [this.checkForTarget.bind(this), this.checkForServerlessCli.bind(this)],
      'deploy:code': [this.deployServerless.bind(this)],
    };
  }

  checkForTarget() {
    if (this.$context.target !== this.$plugin.$id) {
      this.uninstall();
    }
  }

  /**
   * Checks if the serverless CLI is installed.
   */
  async checkForServerlessCli() {
    try {
      await execAsync('serverless -v');
    } catch (error) {
      throw new JovoCliError(
        error.stderr,
        'ServerlessTarget',
        'Please install the Serverless CLI using the command "npm install -g serverless".',
      );
    }
  }

  /**
   * Deploys the project using the previously generated serverless.yaml.
   */
  async deployServerless() {
    const deployTask: Task = new Task(`${ROCKET} Deploying to Serverless`, async () => {
      try {
        await execAsync('serverless deploy', { cwd: this.$cli.$projectPath });
      } catch (error) {
        throw new JovoCliError(
          'Serverless deployment failed.',
          this.$plugin.constructor.name,
          getServerlessError(error.stdout),
        );
      }
    });
    await deployTask.run();
  }
}
