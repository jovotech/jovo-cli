import { DeployCodeContext, DeployCodeEvents } from '@jovotech/cli-command-deploy';
import {
  execAsync,
  JovoCliError,
  PACKAGE,
  PluginHook,
  ExecResponse,
  Task,
  ROCKET,
} from '@jovotech/cli-core';
import { getServerlessError, ServerlessConfig } from '../utilities';

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
    if (!this.$context.target.includes(this.$plugin.id)) {
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
      throw new JovoCliError({
        message: (error as ExecResponse).stderr!,
        module: 'ServerlessTarget',
        hint: 'Please install the Serverless CLI using the command "npm install -g serverless".',
      });
    }
  }

  async bundle(): Promise<void> {
    const bundleTask: Task = new Task(`${PACKAGE} Bundling your code`, async () => {
      try {
        await execAsync(`npm run bundle:${this.$cli.project!.stage || 'dev'}`, {
          cwd: this.$cli.projectPath,
        });
      } catch (error) {
        throw new JovoCliError({
          message: 'Something failed while bundling your project files.',
          module: this.$plugin.constructor.name,
          details: (error as { stderr: string }).stderr,
        });
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
        const passingArguments = process.argv.slice(4).join(' ');
        await execAsync('serverless deploy ' + passingArguments, { cwd: this.$cli.projectPath });
      } catch (error) {
        throw new JovoCliError({
          message: 'Serverless deployment failed.',
          module: this.$plugin.constructor.name,
          details: getServerlessError((error as { stdout: string }).stdout),
        });
      }
    });
    await deployTask.run();
  }
}
