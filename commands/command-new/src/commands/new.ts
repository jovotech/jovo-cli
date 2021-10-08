import {
  ANSWER_CANCEL,
  CliArgs,
  CliFlags,
  CRYSTAL_BALL,
  deleteFolderRecursive,
  EventEmitter,
  flags,
  JovoCli,
  JovoCliError,
  JovoCliPlugin,
  Log,
  MarketplacePlugin,
  PluginCommand,
  PluginContext,
  Preset,
  printHighlight,
  printSubHeadline,
  ProjectProperties,
  promptOverwrite,
  TADA,
  Task,
  WRENCH,
} from '@jovotech/cli-core';
import { existsSync, mkdirSync } from 'fs';
import _merge from 'lodash.merge';
import _pick from 'lodash.pick';
import { join as joinPaths, resolve } from 'path';
import NewCommand from '..';
import {
  promptPreset,
  promptPresetName,
  promptProjectProperties,
  promptSavePreset,
} from '../prompts';
import * as TemplateBuilder from '../TemplateBuilder';
import { downloadTemplate, runNpmInstall } from '../utilities';

export interface NewContext extends PluginContext, Omit<ProjectProperties, 'name' | 'key'> {
  args: CliArgs<typeof New>;
  flags: CliFlags<typeof New>;
  platforms: (MarketplacePlugin & { cliPlugin: JovoCliPlugin })[];
}

export type NewEvents = 'new';

export class New extends PluginCommand<NewEvents> {
  static id = 'new';
  static description = 'Creates a new Jovo project';
  static examples = ['jovov4 new helloworld', 'jovov4 new --preset default'];
  static availablePresets: string[] = [];
  static flags = {
    locale: flags.string({
      char: 'l',
      description: 'The locales to be created	',
      multiple: true,
    }),
    language: flags.string({
      description: 'Specifies the code language of your project',
      options: ['typescript'],
    }),
    preset: flags.string({
      description:
        'Selects a preconfigured preset from the wizard without going through the selection process',
      options: New.availablePresets,
    }),
    clean: flags.boolean({
      description: 'Forces overwriting an existing project',
    }),
    ...PluginCommand.flags,
  };
  // Defines arguments that can be passed to the command.
  static args = [
    <const>{
      name: 'directory',
      description: 'Project directory',
      parse(directory?: string) {
        if (directory && !/^[0-9a-zA-Z-_]+$/.test(directory)) {
          Log.info('Please use a valid directory name.');
          process.exit();
        }

        return directory;
      },
    },
  ];
  $context!: NewContext;

  static install(cli: JovoCli, plugin: NewCommand, emitter: EventEmitter<NewEvents>): void {
    // Override PluginCommand.install() to fill options for --platform.
    this.availablePresets.push(...cli.userConfig.getPresets().map((preset) => preset.name));
    super.install(cli, plugin, emitter);
  }

  async run(): Promise<void> {
    const { args, flags } = this.parse(New);

    Log.spacer();
    Log.info(`jovo new: ${New.description}`);
    Log.info(printSubHeadline('Learn more: https://jovo.tech/docs/cli/new'));
    Log.spacer();

    let preset: Preset | undefined;

    if (!flags['preset']) {
      Log.info(`${CRYSTAL_BALL} Welcome to the Jovo CLI Wizard`);
      Log.spacer();

      try {
        const { selectedPreset } = await promptPreset(this.$cli.userConfig.getPresets());
        if (selectedPreset === 'manual') {
          // Manually select project properties.
          const options: ProjectProperties = await promptProjectProperties(args, flags);

          preset = {
            name: '',
            ...options,
          };

          const { savePreset } = await promptSavePreset();
          if (savePreset) {
            const { presetName } = await promptPresetName();

            preset.name = presetName;

            await this.$cli.userConfig.savePreset(preset);
          }
        } else {
          preset = this.$cli.userConfig.getPreset(selectedPreset);
        }
      } catch (error) {
        if (error instanceof JovoCliError) {
          throw error;
        }

        throw new JovoCliError({
          message: (error as Error).message,
          module: this.$plugin.constructor.name,
        });
      }
    } else if (flags.preset) {
      preset = this.$cli.userConfig.getPreset(flags.preset);
    }

    _merge(this.$context, {
      args,
      flags,
      projectName: '',
      language: flags.language || 'typescript',
      linter: false,
      unitTesting: false,
      locales: flags.locale || ['en'],
      platforms: [],
    });
    // Merge preset's project properties with context object.
    if (preset) {
      const contextPreset: Partial<Preset> = _pick(preset, Object.keys(this.$context));
      _merge(this.$context, contextPreset);
    }

    // If project name is explicitly provided, overwrite it
    if (args.directory) {
      this.$context.projectName = args.directory;
    }

    // Directory is mandatory, so throw an error if omitted.
    if (!this.$context.projectName) {
      throw new JovoCliError({
        message: 'Please provide a directory.',
        module: this.$plugin.constructor.name,
        learnMore: 'For more information, run "jovo new --help".',
      });
    }

    // Check if provided directory already exists, if so, prompt for overwrite.
    if (this.$cli.hasExistingProject(this.$context.projectName)) {
      if (!flags.clean) {
        const { overwrite } = await promptOverwrite(
          `The directory ${printHighlight(
            this.$context.projectName,
          )} already exists. What would you like to do?`,
        );
        if (overwrite === ANSWER_CANCEL) {
          process.exit();
        }
      }
      deleteFolderRecursive(joinPaths(process.cwd(), this.$context.projectName));
    }

    Log.spacer();
    Log.info(`${WRENCH} Setting everything up`);
    Log.spacer();

    const newTask: Task = new Task(
      `Creating new directory ${printHighlight(this.$context.projectName)}/`,
      () => {
        if (!existsSync(this.$context.projectName)) {
          mkdirSync(this.$context.projectName);
        }
        return joinPaths(this.$cli.projectPath, this.$context.projectName);
      },
    );
    await newTask.run();

    const downloadTask: Task = new Task('Downloading and extracting template', async () => {
      try {
        await downloadTemplate(this.$context.projectName);
      } catch (error) {
        throw new JovoCliError({
          message: 'Could not download template.',
          module: this.$plugin.constructor.name,
        });
      }
    });
    await downloadTask.run();

    // Modify package.json to include plugins and omit not needed packages, depending on configuration.
    const generatePackageJsonTask: Task = new Task('Generating package.json', async () => {
      await TemplateBuilder.modifyDependencies(this.$context);
      TemplateBuilder.generateAppConfiguration(this.$context);
    });
    await generatePackageJsonTask.run();

    // Install npm dependencies
    const installNpmTask: Task = new Task('Installing npm dependencies', async () => {
      await runNpmInstall(joinPaths(this.$cli.projectPath, this.$context.projectName));
    });
    await installNpmTask.run();

    // For each selected CLI plugin, load the plugin from node_modules/ to let it potentially hook into the EventEmitter.
    // This allows the plugin to do some configuration on creating a new project, such as generating a default config
    // based on the current context.
    for (const platform of this.$context.platforms) {
      if (!platform.cliModule) {
        continue;
      }
      // Load and instantiate the respective CLI plugin.
      const plugin: JovoCliPlugin = new (require(resolve(
        joinPaths(this.$context.projectName, 'node_modules', platform.package),
      ))[platform.cliModule!])();

      plugin.install(this.$cli, this.$emitter, this.$context);
      platform.cliPlugin = plugin;
    }

    await this.$emitter.run('new');

    TemplateBuilder.copyModels(this.$context);
    TemplateBuilder.generateProjectConfiguration(this.$context);

    Log.spacer();
    Log.info(`${TADA} Successfully created your project!`);
    Log.spacer();
  }
}
