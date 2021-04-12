import {
  checkForProjectDirectory,
  CliFlags,
  JovoCli,
  PluginCommand,
  PluginContext,
  printSubHeadline,
} from '@jovotech/cli-core';
import { DeployPlatformEvents } from './deploy.platform';
import { DeployCodeEvents } from './deploy.code';

const jovo: JovoCli = JovoCli.getInstance();

export type DeployEvents = 'before.deploy' | 'deploy' | 'after.deploy';

export class Deploy extends PluginCommand<DeployEvents | DeployPlatformEvents | DeployCodeEvents> {
  static id: string = 'deploy';
  static description: string = 'Deploys the project to the voice platform.';
  static examples: string[] = [
    'jovo deploy --locale en-US --platform alexaSkill --stage dev',
    'jovo deploy --target zip',
  ];
  static flags = {};
  static args = [];

  install() {
    this.actionSet = {
      'before.deploy': [this.beforeDeploy.bind(this)],
      'deploy': [this.deploy.bind(this)],
      'after.deploy': [this.afterDeploy.bind(this)],
    };
  }

  async beforeDeploy() {
    await this.$emitter.run('before.deploy:platform');
    await this.$emitter.run('before.deploy:code');
  }

  async deploy() {
    await this.$emitter.run('deploy:platform');
    await this.$emitter.run('deploy:code');
  }

  async afterDeploy() {
    await this.$emitter.run('after.deploy:platform');
    await this.$emitter.run('after.deploy:code');
  }

  async run() {
    checkForProjectDirectory();

    const { args, flags } = this.parse(Deploy);

    await this.$emitter.run('parse', { command: Deploy.id, flags, args });

    console.log(`\n jovo deploy: ${Deploy.description}`);
    console.log(printSubHeadline('Learn more: https://jovo.tech/docs/cli/deploy\n'));

    const context: PluginContext = {
      command: Deploy.id,
      platforms: jovo.getPlatforms(),
      locales: jovo.$project!.getLocales(),
      flags: flags as CliFlags<any>,
      args,
    };
    jovo.setPluginContext(context);

    await this.$emitter.run('before.deploy');
    await this.$emitter.run('deploy');
    await this.$emitter.run('after.deploy');

    console.log();
    console.log('  Deployment completed.');
    console.log();
  }
}
