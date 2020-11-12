import { flags } from '@oclif/command';
import { args as Args } from '@oclif/parser';
import { Input } from '@oclif/command/lib/flags';
import { prompt } from 'enquirer';
import { join as joinPaths } from 'path';
import { cli as ux } from 'cli-ux';
import {
  ANSWER_CANCEL,
  BaseCommand,
  deleteFolderRecursive,
  JovoCli,
  JovoCliPluginContext,
  printSubHeadline,
  promptOverwrite,
  STAR,
  Task,
} from 'jovo-cli-core';
import chalk from 'chalk';
import { createEmptyProject, downloadAndExtract } from '../utils';

const jovo: JovoCli = JovoCli.getInstance();

export interface NewPluginContext extends JovoCliPluginContext {
  projectName: string;
}

export interface NewEvents {
  'before.new': NewPluginContext;
  'new': NewPluginContext;
  'after.new': NewPluginContext;
}

export class New extends BaseCommand<NewEvents> {
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
      default: 'helloworld',
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
      default: 'en',
    }),
    'language': flags.string({
      description: 'Sets the programming language of the template.',
      options: ['javascript', 'typescript'],
      default: 'javascript',
    }),
    'typescript': flags.boolean({
      description: 'Sets the programming language of the template to TypeScript.',
      default: false,
    }),
    'default': flags.boolean({
      description: 'Wizard for installation',
    }),
    'build': flags.string({
      description: 'Runs build after "jovo new".',
      options: jovo.getPlatforms(),
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
      },
    },
  ];

  async run() {
    const { args, flags } = this.parse(New);

    await this.$emitter!.run('parse', { command: New.id, flags, args });

    this.log(`\n jovo new: ${New.description}`);
    this.log(printSubHeadline('Learn more: https://jovo.tech/docs/cli/new\n'));

    // Check if provided directory already exists, if so, prompt for overwrite.
    if (jovo.hasExistingProject(args.directory)) {
      const { overwrite } = await promptOverwrite(
        `The directory ${args.directory} already exists. What would you like to do?`,
      );
      if (overwrite === ANSWER_CANCEL) {
        this.exit();
      } else {
        deleteFolderRecursive(joinPaths(process.cwd(), args.directory));
      }
    }

    // ToDo: WIZARD!!
    const context: NewPluginContext = {
      projectName: args.directory,
      command: New.id,
      locales: [],
      platforms: [],
      flags,
      args,
    };

    this.log("  I'm setting everything up");
    this.log();

    await this.$emitter!.run('before.new');

    const newTask: Task = new Task(
      `Creating new directory /${chalk.white.bold(args.directory)}`,
      () => {
        createEmptyProject(context.projectName);
        return context.projectName;
      },
    );

    const downloadTask: Task = new Task(
      `Downloading and extracting template ${chalk.white.bold()}`,
      async () => {
        await downloadAndExtract(context.projectName);
      },
    );

    await newTask.run();

    tasks.add({
      title: `Downloading and extracting template ${chalk.white.bold(config.template!)}`,
      async task(ctx) {
        // TODO: ctx should be empty?
        await project.downloadAndExtract(
          ctx.projectName,
          ctx.template,
          ctx.locales[0],
          ctx.language,
        );

        await project.updateModelLocale(ctx.locales[0]);
      },
    });

    // ToDo: Maybe give user option to use wizard or not?
    if (!flags.default) {
      const options = await prompt([
        {
          name: 'projectName',
          message: 'Project name',
          type: 'input',
          skip: !!args.directory,
          initial: 'helloworld',
        },
        {
          name: 'template',
          message: 'Choose a template',
          type: 'select',
          skip: !!flags.template,
          initial: 0,
          choices: ['helloworld', 'google', 'alexa'],
        },
        {
          name: 'language',
          message: 'Programming language',
          type: 'select',
          skip: !!flags.language || !!flags.typescript,
          choices: ['typescript', 'javascript'],
        },
        {
          name: 'linter',
          message: 'Choose a Linter/Formatter',
          type: 'select',
          choices: ['Prettier', 'TsLint', 'EsLint'],
        },
      ]);

      // @ts-ignore
      const { savePreset } = await prompt(
        // ToDo: Only save preset if at least one option has been made? Not all options as flags?
        {
          name: 'savePreset',
          message: 'Do you want to save this preset?',
          type: 'confirm',
        },
      );

      if (savePreset) {
        // @ts-ignore
        const { presetName } = await prompt({
          name: 'presetName',
          message: 'Preset name',
          type: 'input',
          initial: 'default',
        });
      }
    }

    this.log();
    this.log(`${STAR} Successfully created your project! ${STAR}`);
    this.log();

    const parentTree = ux.tree();
    const projectTree = ux.tree();
    const srcTree = ux.tree();
    srcTree.insert('index.js').insert('app.js').insert('config.js');
    projectTree.insert('src', srcTree);
    parentTree.insert('helloworld', projectTree);
    parentTree.display();
  }
}
