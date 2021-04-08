import { Input as InputFlags } from '@oclif/command/lib/flags';
import {
  checkForProjectDirectory,
  JovoCli,
  JovoCliError,
  PluginCommand,
  printSubHeadline,
  TARGET_ALL,
} from '@jovotech/cli-core';
import { DeployPlatformEvents, DeployPlatformPluginContext } from './deploy.platform';
import { DeployCodeEvents } from './deploy.code';

const jovo: JovoCli = JovoCli.getInstance();

export interface DeployPluginContext extends DeployPlatformPluginContext {}

export type DeployEvents = 'before.deploy' | 'deploy' | 'after.deploy';

export class Deploy extends PluginCommand<DeployEvents | DeployPlatformEvents | DeployCodeEvents> {
  static id: string = 'deploy';
  static description: string = 'Deploys the project to the voice platform.';

  static examples: string[] = [
    'jovo deploy --locale en-US --platform alexaSkill --stage dev',
    'jovo deploy --target zip',
  ];

  static flags: InputFlags<any> = {};

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

    await this.$emitter!.run('parse', { command: Deploy.id, flags, args });

    console.log(`\n jovo deploy: ${Deploy.description}`);
    console.log(printSubHeadline('Learn more: https://jovo.tech/docs/cli/deploy\n'));

    const context: DeployPluginContext = {
      command: Deploy.id,
      platforms: flags.platform ? [flags.platform] : jovo.getPlatforms(),
      locales: jovo.$project!.getLocales(),
      target: TARGET_ALL,
      src: jovo.$project!.getBuildDirectory(),
      flags,
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
