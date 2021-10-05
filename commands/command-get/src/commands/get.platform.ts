import { BuildPlatformEvents } from '@jovotech/cli-command-build';
import {
  checkForProjectDirectory,
  CliArgs,
  CliFlags,
  EventEmitter,
  flags,
  JovoCli,
  Log,
  PluginCommand,
  PluginContext,
  printSubHeadline,
  TADA,
} from '@jovotech/cli-core';
import { existsSync, mkdirSync } from 'fs';
import _merge from 'lodash.merge';
import GetCommand from '..';

export type GetPlatformEvents = 'before.get:platform' | 'get:platform' | 'after.get:platform';

export interface GetPlatformContext extends PluginContext {
  flags: CliFlags<typeof GetPlatform>;
  args: CliArgs<typeof GetPlatform>;
  platforms: string[];
  locales: string[];
  clean: boolean;
}

export class GetPlatform extends PluginCommand<BuildPlatformEvents | GetPlatformEvents> {
  static id = 'get:platform';
  static description = 'Synchronize your local build files with platform developer consoles';
  static examples: string[] = ['jovov4 get:platform alexa'];
  static availablePlatforms: string[] = [];
  static flags = {
    'locale': flags.string({
      char: 'l',
      description: 'The locales to be retrieved',
      multiple: true,
    }),
    'build-reverse': flags.boolean({
      description: 'Turn retrieved models into Jovo Models',
    }),
    'clean': flags.boolean({
      description: 'Overwrite existing files in the build folder',
    }),
    ...PluginCommand.flags,
  };
  static args = [
    <const>{
      name: 'platform',
      description: 'Platform to get files from',
      multiple: true,
      options: GetPlatform.availablePlatforms,
    },
  ];
  // Allow multiple arguments by disabling argument length validation
  static strict = false;
  $context!: GetPlatformContext;

  static install(cli: JovoCli, plugin: GetCommand, emitter: EventEmitter<GetPlatformEvents>): void {
    // Override PluginCommand.install() to fill options for --platform.
    this.availablePlatforms.push(...cli.getPlatforms());
    super.install(cli, plugin, emitter);
  }

  install(): void {
    this.middlewareCollection = {
      'before.get:platform': [this.beforeGet.bind(this)],
    };
  }

  beforeGet(): void {
    // Create build/ folder depending on user config.
    const buildPath: string = this.$cli.project!.getBuildPath();
    if (!existsSync(buildPath)) {
      mkdirSync(buildPath);
    }
  }

  async run(): Promise<void> {
    checkForProjectDirectory(this.$cli.isInProjectDirectory());

    Log.spacer();
    Log.info(`jovo get: ${GetPlatform.description}`);
    Log.info(printSubHeadline('Learn more: https://jovo.tech/docs/cli/get'));
    Log.spacer();

    const { args, flags } = this.parse(GetPlatform);

    _merge(this.$context, {
      args,
      flags,
      platforms: args.platform.length ? args.platform : this.$cli.getPlatforms(),
      locales: flags.locale || this.$cli.project!.getLocales(),
      clean: flags.clean,
    });

    await this.$emitter.run('before.get:platform');
    await this.$emitter.run('get:platform');
    await this.$emitter.run('after.get:platform');

    if (flags['build-reverse']) {
      await this.$emitter.run('build:platform.reverse');
    }

    Log.spacer();
    Log.info(`${TADA} Successfully got your platform project!`);
    Log.spacer();
  }
}
