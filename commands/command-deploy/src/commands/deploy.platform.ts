import { existsSync } from 'fs';
import {
  checkForProjectDirectory,
  EventEmitter,
  flags,
  JovoCli,
  JovoCliError,
  PluginCommand,
  printSubHeadline,
  CliFlags,
  CliArgs,
  TADA,
  Log,
  PluginContext,
} from '@jovotech/cli-core';
import _merge from 'lodash.merge';
import DeployCommand from '..';

export type DeployPlatformFlags = CliFlags<typeof DeployPlatform>;
export type DeployPlatformArgs = CliArgs<typeof DeployPlatform>;
export type DeployPlatformEvents =
  | 'before.deploy:platform'
  | 'deploy:platform'
  | 'after.deploy:platform';
export type DeployTarget = typeof TARGET_ALL | typeof TARGET_INFO | typeof TARGET_MODEL;

export interface DeployPlatformContext extends PluginContext {
  args: DeployPlatformArgs;
  flags: DeployPlatformFlags;
  target: DeployTarget;
  platforms: string[];
  locales: string[];
}

export class DeployPlatform extends PluginCommand<DeployPlatformEvents> {
  static id = 'deploy:platform';
  static description = 'Deploys platform configuration.';
  static examples: string[] = [
    'jovo deploy --locale en-US --platform alexaSkill --stage dev',
    'jovo deploy --target zip',
  ];
  static availablePlatforms: string[] = [];
  static flags = {
    locale: flags.string({
      char: 'l',
      description: 'Locale of the language model.\n<en|de|etc>',
      multiple: true,
    }),
    target: flags.string({
      char: 't',
      description: 'Deploy target.',
      options: [TARGET_ALL, TARGET_INFO, TARGET_MODEL],
      default: TARGET_ALL,
    }),
    ...PluginCommand.flags,
  };
  static args = [
    <const>{
      name: 'platform',
      required: true,
      description: 'Specifies a build platform.',
      options: DeployPlatform.availablePlatforms,
    },
  ];
  $context!: DeployPlatformContext;

  static install(
    cli: JovoCli,
    plugin: DeployCommand,
    emitter: EventEmitter<DeployPlatformEvents>,
  ): void {
    // Override PluginCommand.install() to fill options for --platform.
    this.availablePlatforms.push(...cli.getPlatforms());
    super.install(cli, plugin, emitter);
  }

  install(): void {
    this.middlewareCollection = {
      'before.deploy:platform': [this.checkForPlatformsFolder.bind(this)],
    };
  }

  checkForPlatformsFolder(): void {
    if (!existsSync(this.$cli.project!.getBuildPath())) {
      throw new JovoCliError({
        message: "Couldn't find a platform folder.",
        module: this.$plugin.constructor.name,
        details: 'Please use "jovo build" to create platform-specific files.',
      });
    }
  }

  async run(): Promise<void> {
    checkForProjectDirectory(this.$cli.isInProjectDirectory());

    Log.spacer();
    Log.info(`jovo deploy:platform: ${DeployPlatform.description}`);
    Log.info(printSubHeadline('Learn more: https://jovo.tech/docs/cli/deploy-platform\n'));

    const { args, flags }: { args: DeployPlatformArgs; flags: DeployPlatformFlags } =
      this.parse(DeployPlatform);

    _merge(this.$context, {
      args,
      flags,
      platforms: args.platform ? [args.platform] : this.$cli.getPlatforms(),
      locales: flags.locale || this.$cli.$project!.getLocales(),
      target: flags.target,
    });

    await this.$emitter.run('before.deploy:platform');
    await this.$emitter.run('deploy:platform');
    await this.$emitter.run('after.deploy:platform');

    Log.spacer();
    Log.info(`${TADA} Platform deployment completed.`);
    Log.spacer();
  }
}
