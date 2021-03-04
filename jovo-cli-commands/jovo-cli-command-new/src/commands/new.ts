import { flags } from '@oclif/command';
import { args as Args } from '@oclif/parser';
import { Input } from '@oclif/command/lib/flags';
import { join as joinPaths } from 'path';
import _merge from 'lodash.merge';
import _pick from 'lodash.pick';
import {
  ANSWER_CANCEL,
  CRYSTAL_BALL,
  deleteFolderRecursive,
  JovoCli,
  JovoCliError,
  JovoCliPluginContext,
  JovoCliPreset,
  PluginCommand,
  printHighlight,
  printSubHeadline,
  ProjectProperties,
  promptOverwrite,
  STAR,
  Task,
  WRENCH,
} from 'jovo-cli-core';
import { BuildEvents } from 'jovo-cli-command-build';

import { downloadAndExtract, runNpmInstall } from '../utils';
import { existsSync, mkdirSync } from 'fs';
import {
  promptPreset,
  promptPresetName,
  promptProjectProperties,
  promptSavePreset,
} from '../utils/Prompts';

const jovo: JovoCli = JovoCli.getInstance();

// Extend JovoCliPluginContext with ProjectProperties.
export interface NewPluginContext
  extends JovoCliPluginContext,
    Omit<ProjectProperties, 'name' | 'key'> {}

export interface NewEvents {
  'before.new': NewPluginContext;
  'new': NewPluginContext;
  'after.new': NewPluginContext;
}

export class New extends PluginCommand<NewEvents & BuildEvents> {
  static id: string = 'new';
  // Prints out a description for this command.
  static description = 'Creates a new Jovo project.';
  // Prints out examples for this command.
  static examples = [
    'jovo new jovo-example-project',
    'jovo new jovo-example-project --locale de --language typescript',
  ];
  // Defines flags for this command, such as --help.
  static flags: Input<any> = {
    'template': flags.string({
      char: 't',
      description: 'Name of the template.',
      parse(template: string) {
        if (!/^[0-9a-zA-Z-/_]+$/.test(template)) {
          console.log('Please use a valid template name.');
          process.exit();
        }

        return template.replace('/', '-');
      },
    }),
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
    'build': flags.string({
      description: 'Runs build after "jovo new".',
      // options: jovo.getPlatforms(),
    }),
    'deploy': flags.boolean({
      description: 'Runs deploy after "jovo new --build".',
      dependsOn: ['build'],
    }),
    'skip-npminstall': flags.boolean({
      description: 'Skips "npm install".',
    }),
    'no-wizard': flags.boolean({
      description: 'Disables wizard.',
    }),
  };
  // Defines arguments that can be passed to the command.
  static args: Args.Input = [
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
  ];

  async run() {
    const { args, flags } = this.parse(New);

    await this.$emitter!.run('parse', { command: New.id, flags, args });

    this.log(`\n jovo new: ${New.description}`);
    this.log(printSubHeadline('Learn more: https://jovo.tech/docs/cli/new\n'));

    let preset: JovoCliPreset | undefined;

    if (!flags['no-wizard']) {
      this.log(`${CRYSTAL_BALL} Welcome to the Jovo CLI Wizard. ${CRYSTAL_BALL}`);
      this.log();

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

            jovo.$userConfig.savePreset(preset);
          }
        } else {
          preset = jovo.$userConfig.getPreset(selectedPreset);
        }
      } catch (error) {
        // If no error is given, i.e. user cancelled process, return and exit. Explicitly check, if error.length is 0, as it is undefined on JovoCliError.
        if (error.length === 0) {
          return;
        }

        if (error instanceof JovoCliError) {
          throw error;
        }

        throw new JovoCliError(error.message, 'jovo-cli-command-new');
      }
    } else if (flags.preset) {
      preset = jovo.$userConfig.getPreset(flags.preset);
    }

    const context: NewPluginContext = {
      projectName: args.directory,
      template: flags.template || 'helloworldtest',
      language: flags.language || 'typescript',
      linter: false,
      unitTesting: false,
      command: New.id,
      locales: flags.locale || ['en'],
      // ToDo: What platforms to use?
      platforms: [],
      flags,
      args,
    };

    // Merge preset's project properties with context object.
    if (preset) {
      const contextPreset: Partial<JovoCliPreset> = _pick(preset, Object.keys(context));
      console.log(contextPreset);

      _merge(context, contextPreset);
    } else {
      // Directory is mandatory, so throw an error if omitted.
      if (!context.projectName) {
        throw new JovoCliError(
          'Please provide a directory.',
          'jovo-cli-command-new',
          'For more information, run "jovo new --help".',
        );
      }
    }

    // Check if provided directory already exists, if so, prompt for overwrite.
    if (jovo.hasExistingProject(context.projectName)) {
      const { overwrite } = await promptOverwrite(
        `The directory ${printHighlight(
          context.projectName,
        )} already exists. What would you like to do?`,
      );
      if (overwrite === ANSWER_CANCEL) {
        return;
      } else {
        deleteFolderRecursive(joinPaths(process.cwd(), context.projectName));
      }
    }

    this.log();
    this.log(`  ${WRENCH} I'm setting everything up`);
    this.log();

    await this.$emitter!.run('before.new');

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

    const downloadTask: Task = new Task(
      `Downloading and extracting template ${context.template}`,
      async () => {
        // ToDo: What if multiple locales are provided?
        await downloadAndExtract(
          context.projectName,
          context.template,
          context.locales[0],
          context.language,
        );
      },
    );
    await downloadTask.run();

    // Install npm dependencies.
    if (!flags['skip-npminstall']) {
      const installNpmTask: Task = new Task('Installing npm dependencies...', async () => {
        return runNpmInstall();
      });
      await installNpmTask.run();
    }

    await this.$emitter!.run('new', context);

    // Initialize project.
    jovo.initializeProject(joinPaths(jovo.$projectPath, context.projectName));

    // Build project.
    if (flags.build) {
      this.log();
      await this.$emitter.run('before.build', context);
      await this.$emitter.run('build', context);
      await this.$emitter.run('after.build', context);
    }

    // Deploy project.
    // if (flags.deploy) {
    //   tasks.add({
    //     title: 'Deploying project...',
    //     task(ctx) {
    //       return new Listr(deployTask(ctx));
    //     },
    //   });
    // }

    this.log();
    this.log(`${STAR} Successfully created your project! ${STAR}`);
    this.log();

    await this.$emitter!.run('after.new', context);
  }

  async catch(error: JovoCliError) {
    this.error(`There was a problem:\n${error}`);
  }
}
