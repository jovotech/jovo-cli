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
  MarketplacePlugin,
  PluginCommand,
  printHighlight,
  printSubHeadline,
  ProjectProperties,
  prompt,
  promptOverwrite,
  STAR,
  Task,
  WRENCH,
  CliFlags,
  CliArgs,
  createTypedArguments,
  TADA,
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
  fetchMarketPlace,
  linkPlugins,
} from '../utils';

const jovo: JovoCli = JovoCli.getInstance();

export class New extends PluginCommand {
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
  static args = createTypedArguments([
    {
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
  ]);

  async run(): Promise<void> {
    const { args, flags }: { args: CliArgs<typeof New>; flags: CliFlags<typeof New> } = this.parse(
      New,
    );

    console.log();
    console.log(`jovo new: ${New.description}`);
    console.log(printSubHeadline('Learn more: https://jovo.tech/docs/cli/new\n'));

    let preset: Preset | undefined;

    if (!flags['no-wizard']) {
      console.log(`${CRYSTAL_BALL} Welcome to the Jovo CLI Wizard. ${CRYSTAL_BALL}`);
      console.log();

      try {
        const { selectedPreset } = await promptPreset();
        if (selectedPreset === 'manual') {
          // Manually select project properties.
          const platformPlugins: MarketplacePlugin[] = fetchMarketPlace().filter((plugin) =>
            plugin.tags.includes('platforms'),
          );
          const platforms: prompt.Choice[] = platformPlugins.map((plugin) => ({
            title: plugin.name,
            value: plugin,
          }));
          const options: ProjectProperties = await promptProjectProperties(args, flags, platforms);

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

    const projectProperties: ProjectProperties = {
      projectName: args.directory,
      language: (flags.language as 'javascript' | 'typescript') || 'typescript',
      linter: false,
      unitTesting: false,
      locales: flags.locale || ['en'],
      platforms: [],
    };

    // Merge preset's project properties with context object.
    if (preset) {
      const contextPreset: Partial<Preset> = _pick(preset, Object.keys(projectProperties));

      _merge(projectProperties, contextPreset);
    }

    // Directory is mandatory, so throw an error if omitted.
    if (!projectProperties.projectName) {
      throw new JovoCliError(
        'Please provide a directory.',
        '@jovotech/cli-command-new',
        'For more information, run "jovo new --help".',
      );
    }

    // Check if provided directory already exists, if so, prompt for overwrite.
    if (jovo.hasExistingProject(projectProperties.projectName)) {
      if (!flags.overwrite) {
        const { overwrite } = await promptOverwrite(
          `The directory ${printHighlight(
            projectProperties.projectName,
          )} already exists. What would you like to do?`,
        );
        if (overwrite === ANSWER_CANCEL) {
          process.exit();
        }
      }
      deleteFolderRecursive(joinPaths(process.cwd(), projectProperties.projectName));
    }

    console.log();
    console.log(`${WRENCH} I'm setting everything up`);
    console.log();

    const newTask: Task = new Task(
      `Creating new directory ${printHighlight(projectProperties.projectName)}/`,
      () => {
        if (!existsSync(projectProperties.projectName)) {
          mkdirSync(projectProperties.projectName);
        }
        return joinPaths(jovo.$projectPath, projectProperties.projectName);
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
        joinPaths(jovo.$projectPath, projectProperties.projectName),
      );
    });
    await downloadTask.run();

    const prepareTask: Task = new Task('Preparing template', async () =>
      TemplateBuilder.build(projectProperties),
    );
    await prepareTask.run();

    // Install npm dependencies.
    if (!flags['skip-npminstall']) {
      const installNpmTask: Task = new Task('Installing npm dependencies...', async () => {
        await runNpmInstall(joinPaths(jovo.$projectPath, projectProperties.projectName));
      });
      await installNpmTask.run();
    }

    // ! Rename dependencies to fit to the current MVP structure and link project dependencies for local setup.
    await linkPlugins(resolve(projectProperties.projectName));

    console.log();
    console.log(`${TADA} Successfully created your project! ${TADA}`);
    console.log();
  }
}
