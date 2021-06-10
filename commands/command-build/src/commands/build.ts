// This import is necessary for inferred type annotation for PluginCommand.flags.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import * as Parser from '@oclif/parser';
import { DeployEvents } from '@jovotech/cli-command-deploy';
import { existsSync, mkdirSync } from 'fs';
import _merge from 'lodash.merge';
import {
  PluginContext,
  checkForProjectDirectory,
  Task,
  printSubHeadline,
  TADA,
  wait,
  JovoCli,
  PluginCommand,
  Emitter,
  flags,
  CliFlags,
  TARGET_ALL,
  TARGET_INFO,
  TARGET_MODEL,
  Log,
} from '@jovotech/cli-core';
import { promptForPlatform } from '../utils';
import BuildCommand from '..';

export type BuildFlags = CliFlags<typeof Build>;

export interface BuildContext extends PluginContext {
  flags: BuildFlags;
  platforms: string[];
  locales: string[];
  target: string;
}

export type BuildEvents = 'before.build' | 'build' | 'after.build' | 'reverse.build';

export class Build extends PluginCommand<BuildEvents | DeployEvents> {
  static id = 'build';
  static description = 'Build platform-specific language models based on jovo models folder.';
  static examples: string[] = ['jovo build --platform alexaSkill', 'jovo build --target zip'];
  static availablePlatforms: string[] = [];
  static flags = {
    clean: flags.boolean({
      description:
        'Deletes all platform folders and executes a clean build. If --platform is specified, it deletes only the respective platforms folder.',
    }),
    deploy: flags.boolean({
      char: 'd',
      description: 'Runs deploy after build.',
      exclusive: ['reverse'],
    }),
    force: flags.boolean({
      description: 'Forces overwrite of existing project for reverse build.',
      dependsOn: ['reverse'],
    }),
    locale: flags.string({
      char: 'l',
      description: 'Locale of the language model.\n<en|de|etc>',
      multiple: true,
    }),
    platform: flags.string({
      char: 'p',
      description: 'Specifies a build platform.',
      options: Build.availablePlatforms,
      multiple: true,
    }),
    reverse: flags.boolean({
      char: 'r',
      description: 'Builds Jovo language model from platform specific language model.',
      exclusive: ['deploy'],
    }),
    target: flags.string({
      char: 't',
      description: 'Target of build.',
      options: [TARGET_ALL, TARGET_INFO, TARGET_MODEL],
      default: TARGET_ALL,
    }),
    ...PluginCommand.flags,
  };
  $context!: BuildContext;

  static install(cli: JovoCli, plugin: BuildCommand, emitter: Emitter<BuildEvents>): void {
    // Override PluginCommand.install() to fill options for --platform.
    this.availablePlatforms.push(...cli.getPlatforms());
    super.install(cli, plugin, emitter);
  }

  install(): void {
    this.middlewareCollection = {
      build: [this.prepareBuild.bind(this)],
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
      `Collecting Jovo language model files from ./${this.$cli.$project!.getModelsDirectory()} folder.`,
      async () => {
        await wait(500);
        return `Locales: ${this.$context.locales.join(',')}`;
      },
    );

    initTask.add(collectConfigTask, collectModelsTask);

    await initTask.run();

    // Create build/ folder depending on user config.
    const buildPath: string = this.$cli.$project!.getBuildPath();
    if (!existsSync(buildPath)) {
      mkdirSync(buildPath);
    }
  }

  async run(): Promise<void> {
    checkForProjectDirectory(this.$cli.isInProjectDirectory());

    Log.spacer();
    Log.info(`jovo build: ${Build.description}`);
    Log.info(printSubHeadline('Learn more: https://jovo.tech/docs/cli/build\n'));

    const { flags }: { flags: BuildFlags } = this.parse(Build);

    // Build plugin context, containing information about the current command environment.
    _merge(this.$context, {
      flags,
      locales: flags.locale || this.$cli.$project!.getLocales(),
      platforms: flags.platform || this.$cli.getPlatforms(),
      target: flags.target,
    });

    // If --reverse flag has been set and more than one platform has been specified, prompt for one.
    if (flags.reverse) {
      if (this.$context.platforms.length !== 1) {
        const { platform } = await promptForPlatform(this.$cli.getPlatforms());
        this.$context.platforms = [platform];
      }

      // On build --reverse, omit selecting default locales with $project.getLocales()
      this.$context.locales = flags.locale || [];

      await this.$emitter.run('reverse.build');

      Log.spacer();
      Log.info(`${TADA} Reverse build completed.`);
      Log.spacer();
      return;
    }

    await this.$emitter.run('before.build');
    await this.$emitter.run('build');
    await this.$emitter.run('after.build');

    if (flags.deploy) {
      Log.spacer();
      await this.$emitter.run('before.deploy');
      await this.$emitter.run('deploy');
      await this.$emitter.run('after.deploy');
    }

    Log.spacer();
    Log.info(`${TADA} Build completed.`);
    Log.spacer();
  }
}
