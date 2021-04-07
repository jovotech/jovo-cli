import * as Config from '@oclif/config';
import { Input as InputFlags } from '@oclif/command/lib/flags';
import { DeployEvents, DeployPluginContext } from '@jovotech/cli-command-deploy';
import { existsSync, mkdirSync } from 'fs';
import {
  validateLocale,
  PluginContext,
  checkForProjectDirectory,
  Task,
  printSubHeadline,
  TADA,
  wait,
  JovoCli,
  PluginCommand,
  Emitter,
  PluginConfig,
  flags,
  TARGET_ALL,
  LocaleMap,
  localeReducer,
} from '@jovotech/cli-core';
import { promptForPlatform } from '../utils';

const jovo: JovoCli = JovoCli.getInstance();

export interface BuildEvents {
  'before.build': PluginContext;
  'build': PluginContext;
  'after.build': PluginContext;
  'reverse.build': PluginContext;
}

export class Build extends PluginCommand<BuildEvents & DeployEvents> {
  static id: string = 'build';

  static description: string =
    'Build platform-specific language models based on jovo models folder.';

  static examples: string[] = ['jovo build --platform alexaSkill', 'jovo build --target zip'];

  static availablePlatforms: string[] = [];

  static flags: InputFlags<any> = {
    clean: flags.boolean({
      description:
        'Deletes all platform folders and executes a clean build. If --platform is specified, it deletes only the respective platforms folder.',
    }),
    deploy: flags.boolean({
      char: 'd',
      description: 'Runs deploy after build.',
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
    }),
    stage: flags.string({
      description: 'Takes configuration from specified stage.',
    }),
    target: flags.string({
      char: 't',
      description: 'Target of build.',
      // options: [TARGET_ALL, TARGET_INFO, TARGET_MODEL, TARGET_ZIP, ...deployTargets.getAllPluginTargets()],
    }),
  };
  static args = [];

  static async install(
    emitter: Emitter<BuildEvents>,
    config: PluginConfig,
  ): Promise<Config.Command.Plugin> {
    // Override PluginCommand.install() to fill options for --platform.
    this.availablePlatforms.push(...jovo.getPlatforms());
    return super.install(emitter, config);
  }

  install() {
    this.actionSet = {
      'before.build': [this.beforeBuild.bind(this)],
      'build': [this.build.bind(this)],
    };
  }

  async beforeBuild(context: PluginContext) {
    // If --reverse flag has been set and more than one platform has been specified, prompt for one.
    if (context.flags.reverse) {
      if (context.platforms.length !== 1) {
        const { platform } = await promptForPlatform(jovo.getPlatforms());
        context.platforms = [platform];
      }

      await this.$emitter!.run('reverse.build', context);
      this.uninstall();
    }
  }

  async build(context: PluginContext) {
    // Create "fake" tasks for more verbose logs.
    const initTask: Task = new Task(`${TADA} Initializing build process`);

    const collectConfigTask: Task = new Task(
      'Collecting platform configuration from project.js.',
      async () => {
        await wait(500);
        return `Platforms: ${context.platforms.join(',')}`;
      },
    );
    const collectModelsTask: Task = new Task(
      `Collecting Jovo language model files from ./${jovo.$project!.getModelsDirectory()} folder.`,
      async () => {
        await wait(500);
        return `Locales: ${Object.keys(context.locales).join(',')}`;
      },
    );

    initTask.add(collectConfigTask, collectModelsTask);

    await initTask.run();

    // Create build/ folder depending on user config.
    const buildPath: string = jovo.$project!.getBuildPath();
    if (!existsSync(buildPath)) {
      mkdirSync(buildPath);
    }
  }

  async run() {
    checkForProjectDirectory();

    const { args, flags } = this.parse(Build);

    await this.$emitter.run('parse', { command: Build.id, flags, args });

    console.log(`\n jovo build: ${Build.description}`);
    console.log(printSubHeadline('Learn more: https://jovo.tech/docs/cli/build\n'));

    // Build plugin context, containing information about the current command environemnt.

    const context: PluginContext = {
      command: Build.id,
      locales: (flags.locale || jovo.$project!.getLocales()).reduce(localeReducer, {}),
      platforms: flags.platform ? [...flags.platform] : jovo.getPlatforms(),
      flags,
      args,
    };

    await this.$emitter.run('before.build', context);
    await this.$emitter.run('build', context);
    await this.$emitter.run('after.build', context);

    if (flags.deploy) {
      console.log();
      const deployContext: DeployPluginContext = {
        ...context,
        target: TARGET_ALL,
        src: jovo.$project!.getBuildDirectory(),
      };
      await this.$emitter.run('before.deploy', deployContext);
      await this.$emitter.run('deploy', deployContext);
      await this.$emitter.run('after.deploy', deployContext);
    }

    console.log();
    console.log('  Build completed.');
    console.log();
  }
}
