import { Input as InputFlags } from '@oclif/command/lib/flags';
import {
  checkForProjectDirectory,
  JovoCli,
  PluginCommand,
  printSubHeadline,
  TARGET_ALL,
} from 'jovo-cli-core';
import { DeployPlatformEvents, DeployPlatformPluginContext } from './deploy:platform';

const jovo: JovoCli = JovoCli.getInstance();

export interface DeployPluginContext extends DeployPlatformPluginContext {}

export interface DeployEvents {
  'before.deploy': DeployPluginContext;
  'deploy': DeployPluginContext;
  'after.deploy': DeployPluginContext;
}

export class Deploy extends PluginCommand<DeployEvents & DeployPlatformEvents> {
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

  async beforeDeploy(context: DeployPluginContext) {
    await this.$emitter.run('before.deploy:platform', context);
  }

  async deploy(context: DeployPluginContext) {
    // ToDo: Run deploy:code middleware.
    await this.$emitter.run('deploy:platform', context);
  }

  async afterDeploy(context: DeployPluginContext) {
    await this.$emitter.run('after.deploy:platform', context);
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
      locales: flags.locale ? [flags.locale] : jovo.$project!.getLocales(),
      target: TARGET_ALL,
      src: jovo.$project!.getBuildDirectory(),
      flags,
      args,
    };

    await this.$emitter.run('before.deploy', context);
    await this.$emitter.run('deploy', context);
    await this.$emitter.run('after.deploy', context);

    console.log();
    console.log('  Deployment completed.');
    console.log();
  }
}
