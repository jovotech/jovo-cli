// This import is necessary for inferred type annotation for PluginCommand.flags.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import * as Parser from '@oclif/parser';
import { join as joinPaths, resolve } from 'path';
import _merge from 'lodash.merge';
import _pick from 'lodash.pick';
import {
  ANSWER_CANCEL,
  CRYSTAL_BALL,
  deleteFolderRecursive,
  flags,
  JovoCli,
  JovoCliError,
  Preset,
  PluginCommand,
  printHighlight,
  printSubHeadline,
  ProjectProperties,
  promptOverwrite,
  Task,
  WRENCH,
  CliFlags,
  CliArgs,
  TADA,
  JovoCliPlugin,
  PluginContext,
  MarketplacePlugin,
} from '@jovotech/cli-core';
import { copySync } from 'fs-extra';
import { existsSync, mkdirSync } from 'fs';

import {
  runNpmInstall,
  promptPreset,
  promptPresetName,
  promptProjectProperties,
  promptSavePreset,
  TemplateBuilder,
  linkPlugins,
} from '../utils';

const jovo: JovoCli = JovoCli.getInstance();

export type NewArgs = CliArgs<typeof New>;
export type NewFlags = CliFlags<typeof New>;

export interface NewContext
  extends Omit<PluginContext, 'platforms'>,
    Omit<ProjectProperties, 'name' | 'key'> {
  args: NewArgs;
  flags: NewFlags;
  platforms: (MarketplacePlugin & { cliPlugin: JovoCliPlugin })[];
}

export type NewEvents = 'new';

export class New extends PluginCommand<NewEvents> {
  static id = 'new';
  // Prints out a description for this command.
  static description = 'Creates a new Jovo project.';
  // Prints out examples for this command.
  static examples = [
    'jovo new jovo-example-project',
    'jovo new jovo-example-project --locale de --language typescript',
  ];
  // Defines flags for this command, such as --help.
  static flags = {
    'locale': flags.string({
      char: 'l',
      description: 'Locale of the language model.',
      multiple: true,
    }),
    'language': flags.string({
      description: 'Sets the programming language of the template.',
      options: ['javascript', 'typescript'],
    }),
    'typescript': flags.boolean({
      description: 'Sets the programming language of the template to TypeScript.',
    }),
    'preset': flags.string({
      description:
        'Selects a preconfigured preset from the wizard without going through the selection process.',
      dependsOn: ['no-wizard'],
      options: jovo.$userConfig.getPresets().map((preset) => preset.name),
    }),
    'skip-npminstall': flags.boolean({
      description: 'Skips "npm install".',
    }),
    'no-wizard': flags.boolean({
      description: 'Disables wizard.',
    }),
    'overwrite': flags.boolean({
      description: 'Forces overwriting an existing project.',
    }),
  };
  // Defines arguments that can be passed to the command.
  static args = [
    <const>{
      name: 'directory',
      description: 'Project directory.',
      parse(directory?: string) {
        if (directory && !/^[0-9a-zA-Z-_]+$/.test(directory)) {
          console.log('Please use a valid directory name.');
          process.exit();
        }

        return directory;
      },
    },
  ];

  async run(): Promise<void> {
    const { args, flags }: { args: NewArgs; flags: NewFlags } = this.parse(New);

    console.log();
    console.log(`jovo new: ${New.description}`);
    console.log(printSubHeadline('Learn more: https://jovo.tech/docs/cli/new\n'));

    let preset: Preset | undefined;

    if (!flags['no-wizard']) {
      console.log(`${CRYSTAL_BALL} Welcome to the Jovo CLI Wizard.`);
      console.log();

      try {
        const { selectedPreset } = await promptPreset();
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

            await jovo.$userConfig.savePreset(preset);
          }
        } else {
          preset = jovo.$userConfig.getPreset(selectedPreset);
        }
      } catch (error) {
        if (error instanceof JovoCliError) {
          throw error;
        }

        throw new JovoCliError(error.message, '@jovotech/cli-command-new');
      }
    } else if (flags.preset) {
      preset = jovo.$userConfig.getPreset(flags.preset);
    }

    const context: NewContext = {
      command: New.id,
      projectName: args.directory,
      language: (flags.language as 'javascript' | 'typescript') || 'typescript',
      linter: false,
      unitTesting: false,
      locales: flags.locale || ['en'],
      platforms: [],
      flags,
      args,
    };

    // Merge preset's project properties with context object.
    if (preset) {
      const contextPreset: Partial<Preset> = _pick(preset, Object.keys(context));

      _merge(context, contextPreset);
    }

    // Directory is mandatory, so throw an error if omitted.
    if (!context.projectName) {
      throw new JovoCliError(
        'Please provide a directory.',
        '@jovotech/cli-command-new',
        'For more information, run "jovo new --help".',
      );
    }

    // Check if provided directory already exists, if so, prompt for overwrite.
    if (jovo.hasExistingProject(context.projectName)) {
      if (!flags.overwrite) {
        const { overwrite } = await promptOverwrite(
          `The directory ${printHighlight(
            context.projectName,
          )} already exists. What would you like to do?`,
        );
        if (overwrite === ANSWER_CANCEL) {
          process.exit();
        }
      }
      deleteFolderRecursive(joinPaths(process.cwd(), context.projectName));
    }

    console.log();
    console.log(`${WRENCH} I'm setting everything up`);
    console.log();

    const newTask: Task = new Task(
      `Creating new directory ${printHighlight(context.projectName)}/`,
      () => {
        if (!existsSync(context.projectName)) {
          mkdirSync(context.projectName);
        }
        return joinPaths(jovo.$projectPath, context.projectName);
      },
    );
    await newTask.run();

    const downloadTask: Task = new Task('Downloading and extracting template', async () => {
      // await downloadAndExtract(
      //   context.projectName,
      //   context.template,
      //   context.locales[0],
      //   context.language,
      // );
      let templatePath: string;

      if (existsSync(joinPaths('./', 'template'))) {
        templatePath = 'template';
      } else if (existsSync(joinPaths('./', 'jovo-template-dev'))) {
        templatePath = 'jovo-template-dev';
      } else {
        throw new JovoCliError('Template could not be found.', 'NewCommand');
      }

      copySync(
        joinPaths(jovo.$projectPath, templatePath),
        joinPaths(jovo.$projectPath, context.projectName),
      );
    });
    await downloadTask.run();

    // Modify package.json to include plugins and omit not needed packages, depending on configuration.
    await TemplateBuilder.modifyDependencies(context);
    TemplateBuilder.generateAppConfiguration(context);

    // Install npm dependencies.
    if (!flags['skip-npminstall']) {
      const installNpmTask: Task = new Task('Installing npm dependencies...', async () => {
        await runNpmInstall(joinPaths(jovo.$projectPath, context.projectName));
      });
      await installNpmTask.run();
    }

    // ! Rename dependencies to fit to the current MVP structure and link project dependencies for local setup.
    const linkTask: Task = new Task(
      'Linking local dependencies',
      async () => await linkPlugins(resolve(context.projectName)),
    );
    await linkTask.run();

    // For each selected CLI plugin, load the plugin from node_modules/ to let it potentially hook into the EventEmitter.
    // This allows the plugin to do some configuration on creating a new project, such as generating a default config
    // based on the current context.
    for (const platform of context.platforms) {
      // Load and instantiate the respective CLI plugin with the config set to null, which resolves to the default config (i.e. JovoCliPlugin.$config).
      const plugin: JovoCliPlugin = new (require(resolve(
        joinPaths(context.projectName, 'node_modules', platform.package),
      ))[platform.cliModule!])(null);

      plugin.install(this.$emitter);

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      plugin.setPluginContext(context);
      platform.cliPlugin = plugin;
    }

    await this.$emitter.run('new');

    TemplateBuilder.generateProjectConfiguration(context);

    console.log();
    console.log(`${TADA} Successfully created your project!`);
    console.log();
  }
}
