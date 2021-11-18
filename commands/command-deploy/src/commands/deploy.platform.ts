import { existsSync } from 'fs';
import {
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
  ProjectCommand,
} from '@jovotech/cli-core';
import _merge from 'lodash.merge';
import DeployCommand from '..';

export type DeployPlatformEvents =
  | 'before.deploy:platform'
  | 'deploy:platform'
  | 'after.deploy:platform';

export interface DeployPlatformContext extends PluginContext {
  args: CliArgs<typeof DeployPlatform>;
  flags: CliFlags<typeof DeployPlatform>;
  platforms: string[];
  locales: string[];
}

@ProjectCommand()
export class DeployPlatform extends PluginCommand<DeployPlatformEvents> {
  static id = 'deploy:platform';
  static description = "Deploy to the specified platform's developer console";
  static examples: string[] = ['jovo deploy:platform', 'jovo deploy:platform alexa'];
  static availablePlatforms: string[] = [];
  static flags = {
    locale: flags.string({
      char: 'l',
      description: 'The locales to be deployed',
      multiple: true,
    }),
    ...PluginCommand.flags,
  };
  static args = [
    <const>{
      name: 'platform',
      description: 'Specify the platform to be deployed to',
      multiple: true,
      options: DeployPlatform.availablePlatforms,
    },
  ];
  // Allow multiple arguments by disabling argument length validation
  static strict = false;

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
    Log.spacer();
    Log.info(`jovo deploy:platform: ${DeployPlatform.description}`);
    Log.info(printSubHeadline('Learn more: https://jovo.tech/docs/cli/deploy-platform'));
    Log.spacer();

    const { args, flags } = this.parse(DeployPlatform);

    _merge(this.$context, {
      args,
      flags,
      platforms: args.platform.length ? args.platform : this.$cli.getPlatforms(),
      locales: flags.locale || this.$cli.project!.getLocales(),
    });

    await this.$emitter.run('before.deploy:platform');
    await this.$emitter.run('deploy:platform');
    await this.$emitter.run('after.deploy:platform');

    Log.spacer();
    Log.info(`${TADA} Platform deployment completed.`);
    Log.spacer();
  }
}
