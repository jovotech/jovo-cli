import { DeployPlatformEvents } from '@jovotech/cli-command-deploy';
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
  Task,
  wait,
} from '@jovotech/cli-core';
import { existsSync, mkdirSync } from 'fs';
import _merge from 'lodash.merge';
import BuildCommand from '..';
import { promptForPlatform } from '../utilities';

export interface BuildPlatformContext extends PluginContext {
  args: CliArgs<typeof BuildPlatform>;
  flags: CliFlags<typeof BuildPlatform>;
  platforms: string[];
  locales: string[];
}

export type BuildPlatformEvents =
  | 'before.build:platform'
  | 'build:platform'
  | 'build:platform.reverse'
  | 'after.build:platform';

export class BuildPlatform extends PluginCommand<BuildPlatformEvents | DeployPlatformEvents> {
  static id = 'build:platform';
  static description = 'Build platform-specific language models based on jovo models folder';
  static examples = ['jovo build:platform alexa'];
  static availablePlatforms: string[] = [];
  static flags = {
    clean: flags.boolean({
      description: 'Delete the relevant folders in build at the beginning of the process',
    }),
    deploy: flags.boolean({
      char: 'd',
      description:
        'Directly deploy the platform after the build process. Run "deploy:platform --help" command for more information.',
      exclusive: ['reverse'],
    }),
    locale: flags.string({
      char: 'l',
      description: 'The locales to be built from the models folder',
      multiple: true,
    }),
    reverse: flags.boolean({
      char: 'r',
      description: 'Turn contents of the build folder into Jovo Model files',
      exclusive: ['deploy'],
    }),
    ...PluginCommand.flags,
  };
  static args = [
    <const>{
      name: 'platform',
      description: 'Specifies a build platform',
      options: BuildPlatform.availablePlatforms,
      multiple: true,
    },
  ];
  // Allow multiple arguments by disabling argument length validation
  static strict = false;

  $context!: BuildPlatformContext;

  static install(
    cli: JovoCli,
    plugin: BuildCommand,
    emitter: EventEmitter<BuildPlatformEvents>,
  ): void {
    // Override PluginCommand.install() to fill options for --platform.
    this.availablePlatforms.push(...cli.getPlatforms());
    super.install(cli, plugin, emitter);
  }

  install(): void {
    this.middlewareCollection = {
      'build:platform': [this.prepareBuild.bind(this)],
    };
  }

  async prepareBuild(): Promise<void> {
    // Create "fake" tasks for more verbose logs.
    const initTask: Task = new Task(`${TADA} Initializing build process`);

    const collectConfigTask: Task = new Task(
      'Collecting platform configuration from project.js.',
      async () => {
        await wait(500);
        return `Platforms: ${this.$context.platforms.join(',')}`;
      },
    );
    const collectModelsTask: Task = new Task(
      `Collecting Jovo language model files from ./${this.$cli.project!.getModelsDirectory()} folder.`,
      async () => {
        await wait(500);
        return `Locales: ${this.$context.locales.join(',')}`;
      },
    );

    initTask.add(collectConfigTask, collectModelsTask);

    await initTask.run();

    // Create build/ folder depending on user config.
    const buildPath: string = this.$cli.project!.getBuildPath();
    if (!existsSync(buildPath)) {
      mkdirSync(buildPath, { recursive: true });
    }
  }

  async run(): Promise<void> {
    checkForProjectDirectory(this.$cli.isInProjectDirectory());

    Log.spacer();
    Log.info(`jovo build:platform: ${BuildPlatform.description}`);
    Log.info(printSubHeadline('Learn more: https://jovo.tech/docs/cli/build\n'));

    const { args, flags } = this.parse(BuildPlatform);

    // Build plugin context, containing information about the current command environment.
    _merge(this.$context, {
      args,
      flags,
      locales: flags.locale || this.$cli.project!.getLocales(),
      platforms: args.platform.length ? args.platform : this.$cli.getPlatforms(),
    });

    // If --reverse flag has been set and more than one platform has been specified, prompt for one.
    if (flags.reverse) {
      if (this.$context.platforms.length !== 1) {
        const { platform } = await promptForPlatform(this.$context.platforms);
        this.$context.platforms = [platform];
      }

      // On build --reverse, omit selecting default locales with $project.getLocales()
      this.$context.locales = flags.locale || [];

      await this.$emitter.run('build:platform.reverse');

      Log.spacer();
      Log.info(`${TADA} Reverse build completed.`);
      Log.spacer();
      return;
    }

    await this.$emitter.run('before.build:platform');
    await this.$emitter.run('build:platform');
    await this.$emitter.run('after.build:platform');

    if (flags.deploy) {
      Log.spacer();
      await this.$emitter.run('before.deploy:platform');
      await this.$emitter.run('deploy:platform');
      await this.$emitter.run('after.deploy:platform');
    }

    Log.spacer();
    Log.info(`${TADA} Build completed.`);
    Log.spacer();
  }
}
