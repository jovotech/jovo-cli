import {
  checkForProjectDirectory,
  CliFlags,
  PluginCommand,
  PluginContext,
  printSubHeadline,
  TADA,
} from '@jovotech/cli-core';
import { DeployPlatformEvents } from './deploy.platform';
import { DeployCodeEvents } from './deploy.code';

export type DeployEvents = 'before.deploy' | 'deploy' | 'after.deploy';

export class Deploy extends PluginCommand<DeployEvents | DeployPlatformEvents | DeployCodeEvents> {
  static id = 'deploy';
  static description = 'Deploys the project to the voice platform.';
  static examples: string[] = [
    'jovo deploy --locale en-US --platform alexaSkill --stage dev',
    'jovo deploy --target zip',
  ];
  static flags = {};
  static args = [];

  install(): void {
    this.middlewareCollection = {
      'before.deploy': [this.beforeDeploy.bind(this)],
      'deploy': [this.deploy.bind(this)],
      'after.deploy': [this.afterDeploy.bind(this)],
    };
  }

  async beforeDeploy(): Promise<void> {
    await this.$emitter.run('before.deploy:platform');
    await this.$emitter.run('before.deploy:code');
  }

  async deploy(): Promise<void> {
    await this.$emitter.run('deploy:platform');
    await this.$emitter.run('deploy:code');
  }

  async afterDeploy(): Promise<void> {
    await this.$emitter.run('after.deploy:platform');
    await this.$emitter.run('after.deploy:code');
  }

  async run(): Promise<void> {
    checkForProjectDirectory(this.$cli.isInProjectDirectory());

    const { args, flags } = this.parse(Deploy);

    await this.$emitter.run('parse', { command: Deploy.id, flags, args });

    console.log();
    console.log(`jovo deploy: ${Deploy.description}`);
    console.log(printSubHeadline('Learn more: https://jovo.tech/docs/cli/deploy\n'));

    const context: PluginContext = {
      command: Deploy.id,
      platforms: this.$cli.getPlatforms(),
      locales: this.$cli.$project!.getLocales(),
      flags: flags as CliFlags<typeof Deploy>,
      args,
    };
    this.$cli.setPluginContext(context);

    await this.$emitter.run('before.deploy');
    await this.$emitter.run('deploy');
    await this.$emitter.run('after.deploy');

    console.log();
    console.log(`${TADA} Deployment completed. ${TADA}`);
    console.log();
  }
}
