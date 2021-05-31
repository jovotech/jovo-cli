import { execAsync, JovoCliError, PACKAGE, PluginHook, ROCKET, Task } from '@jovotech/cli-core';
import { DeployCodeEvents, DeployCodeContext } from '@jovotech/cli-command-deploy';

import { getServerlessError, ServerlessConfig } from '../utils';

export class DeployHook extends PluginHook<DeployCodeEvents> {
  $config!: ServerlessConfig;
  $context!: DeployCodeContext;

  install(): void {
    this.middlewareCollection = {
      'before.deploy:code': [this.checkForTarget.bind(this), this.checkForServerlessCli.bind(this)],
      'deploy:code': [this.bundle.bind(this), this.deployServerless.bind(this)],
    };
  }

  checkForTarget(): void {
    if (!this.$context.target.includes(this.$plugin.$id)) {
      this.uninstall();
    }
  }

  /**
   * Checks if the serverless CLI is installed.
   */
  async checkForServerlessCli(): Promise<void> {
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

  async bundle(): Promise<void> {
    const bundleTask: Task = new Task(`${PACKAGE} Bundling your code`, async () => {
      try {
        await execAsync(`npm run bundle:${this.$cli.$project!.$stage}`, {
          cwd: this.$cli.$projectPath,
        });
      } catch (error) {
        throw new JovoCliError(
          'Something failed while bundling your project files.',
          this.$plugin.constructor.name,
          error.stderr,
        );
      }
    });
    await bundleTask.run();
  }

  /**
   * Deploys the project using the previously generated serverless.yaml.
   */
  async deployServerless(): Promise<void> {
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
