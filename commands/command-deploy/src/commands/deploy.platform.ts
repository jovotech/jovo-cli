import * as Config from '@oclif/config';
import { Input as InputFlags } from '@oclif/command/lib/flags';
import { existsSync } from 'fs';
import {
  checkForProjectDirectory,
  Emitter,
  flags,
  JovoCli,
  JovoCliError,
  PluginConfig,
  PluginContext,
  PluginCommand,
  printSubHeadline,
  TARGET_ALL,
  TARGET_INFO,
  TARGET_MODEL,
} from '@jovotech/cli-core';
import DeployCommand from '..';

const jovo: JovoCli = JovoCli.getInstance();

export interface DeployPlatformPluginContext extends PluginContext {
  target: typeof TARGET_ALL | typeof TARGET_INFO | typeof TARGET_MODEL;
  src: string;
}

export type DeployPlatformEvents =
  | 'before.deploy:platform'
  | 'deploy:platform'
  | 'after.deploy:platform';

export class DeployPlatform extends PluginCommand<DeployPlatformEvents> {
  static id: string = 'deploy:platform';
  static description: string = 'Deploys platform configuration.';

  static examples: string[] = [
    'jovo deploy --locale en-US --platform alexaSkill --stage dev',
    'jovo deploy --target zip',
  ];

  static availablePlatforms: string[] = [];

  static flags: InputFlags<any> = {
    locale: flags.string({
      char: 'l',
      description: 'Locale of the language model.\n<en|de|etc>',
      multiple: true,
    }),
    platform: flags.string({
      char: 'p',
      description: 'Specifies a build platform.',
      options: DeployPlatform.availablePlatforms,
      multiple: true,
    }),
    stage: flags.string({
      description: 'Takes configuration from specified stage.',
    }),
    target: flags.string({
      char: 't',
      description: 'Deploy target.',
      options: [TARGET_ALL, TARGET_INFO, TARGET_MODEL],
      default: TARGET_ALL,
    }),
    src: flags.string({
      char: 's',
      description: 'Location of model files.',
    }),
  };
  static args = [];

  static async install(
    plugin: DeployCommand,
    emitter: Emitter<DeployPlatformEvents>,
    config: PluginConfig,
  ): Promise<Config.Command.Plugin> {
    // Override PluginCommand.install() to fill options for --platform.
    this.availablePlatforms.push(...jovo.getPlatforms());
    return super.install(plugin, emitter, config);
  }

  install() {
    this.actionSet = {
      'before.deploy:platform': [this.checkForPlatformsFolder.bind(this)],
    };
  }

  checkForPlatformsFolder() {
    if (!existsSync(jovo.$project!.getBuildPath())) {
      throw new JovoCliError(
        "Couldn't find a platform folder.",
        this.$plugin.constructor.name,
        'Please use "jovo build" to create platform-specific files.',
      );
    }
  }

  async run() {
    checkForProjectDirectory();

    const { args, flags } = this.parse(DeployPlatform);

    await this.$emitter.run('parse', { command: DeployPlatform.id, flags, args });

    console.log(`\n jovo deploy: ${DeployPlatform.description}`);
    console.log(printSubHeadline('Learn more: https://jovo.tech/docs/cli/deploy-platform\n'));

    const context: DeployPlatformPluginContext = {
      command: DeployPlatform.id,
      platforms: flags.platform || jovo.getPlatforms(),
      locales: flags.locale || jovo.$project!.getLocales(),
      target: flags.target,
      src: flags.src || jovo.$project!.getBuildDirectory(),
      flags,
      args,
    };
    jovo.setPluginContext(context);

    await this.$emitter.run('before.deploy:platform');
    await this.$emitter.run('deploy:platform');
    await this.$emitter.run('after.deploy:platform');

    console.log();
    console.log('  Platform deployment completed.');
    console.log();
  }
}
