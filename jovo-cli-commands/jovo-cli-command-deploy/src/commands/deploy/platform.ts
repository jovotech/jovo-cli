import * as Config from '@oclif/config';
import { Input as InputFlags } from '@oclif/command/lib/flags';
import { existsSync } from 'fs';
import {
  checkForProjectDirectory,
  Emitter,
  flags,
  JovoCli,
  JovoCliError,
  JovoCliPluginConfig,
  JovoCliPluginContext,
  PluginCommand,
  printSubHeadline,
  TARGET_ALL,
  TARGET_INFO,
  TARGET_MODEL,
} from 'jovo-cli-core';

const jovo: JovoCli = JovoCli.getInstance();

export interface DeployPlatformPluginContext extends JovoCliPluginContext {
  target: typeof TARGET_ALL | typeof TARGET_INFO | typeof TARGET_MODEL;
  src: string;
}

export interface DeployPlatformEvents {
  'before.deploy:platform': DeployPlatformPluginContext;
  'deploy:platform': DeployPlatformPluginContext;
  'after.deploy:platform': DeployPlatformPluginContext;
}

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
    emitter: Emitter<DeployPlatformEvents>,
    config: JovoCliPluginConfig,
  ): Promise<Config.Command.Plugin> {
    // Override PluginCommand.install() to fill options for --platform.
    this.availablePlatforms.push(...jovo.getPlatforms());
    return super.install(emitter, config);
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
        this.$config.pluginName!,
        'Please use "jovo build" to create platform-specific files.',
      );
    }
  }

  async run() {
    checkForProjectDirectory();

    const { args, flags } = this.parse(DeployPlatform);

    await this.$emitter!.run('parse', { command: DeployPlatform.id, flags, args });

    this.log(`\n jovo deploy: ${DeployPlatform.description}`);
    this.log(printSubHeadline('Learn more: https://jovo.tech/docs/cli/deploy-platform\n'));

    const context: DeployPlatformPluginContext = {
      command: DeployPlatform.id,
      platforms: flags.platform ? [flags.platform] : jovo.getPlatforms(),
      locales: flags.locale ? [flags.locale] : jovo.$project!.getLocales(),
      target: flags.target,
      src: flags.src || jovo.$project!.getBuildDirectory(),
      flags,
      args,
    };

    await this.$emitter.run('before.deploy:platform', context);
    await this.$emitter.run('deploy:platform', context);
    await this.$emitter.run('after.deploy:platform', context);

    this.log();
    this.log('  Platform deployment completed.');
    this.log();
  }
}
