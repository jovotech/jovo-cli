import { Command, flags } from '@oclif/command';
import chalk from 'chalk';
import {
  DEFAULT_ENDPOINT,
  DEFAULT_LANGUAGE,
  DEFAULT_TEMPLATE,
  ENDPOINT_JOVOWEBHOOK,
  ENDPOINT_NGROK,
  ENDPOINT_NONE,
  getProject,
  InputFlags,
  JovoTaskContext,
} from 'jovo-cli-core';
import * as Listr from 'listr';
import * as _ from 'lodash';
import * as path from 'path';
import {
  addBaseCliOptions,
  deleteFolderRecursive,
  JovoCliRenderer,
  platforms,
  prompts,
  tasks,
  validators,
} from '../utils';
const { ANSWER_CANCEL, promptNewProject, promptOverwriteProject } = prompts;
const { isValidProjectName, isValidTemplate } = validators;
const { buildTask, deployTask } = tasks;

export class New extends Command {
  // Prints out a description for this command.
  static description = 'Creates a new Jovo project.';

  // Prints out examples for this command.
  static examples = [
    'jovo new jovo-example-project',
    'jovo new jovo-example-project --locale de-DE --language typescript',
  ];

  // Defines flags for this command, such as --help.
  static flags: InputFlags = {
    'template': flags.string({
      char: 't',
      description: 'Name of the template.',
      default: 'helloworld',
      parse(template: string) {
        return template.replace('/', '-');
      },
    }),
    'locale': flags.string({
      char: 'l',
      // TODO: Options -> regex for locales?
      description: 'Locale of the language model\n<en-US|de-DE|etc>',
      default: 'en-US',
    }),
    'build': flags.string({
      description: 'Runs build after new',
      options: platforms.getAllAvailable(),
    }),
    'deploy': flags.boolean({
      description: 'Runs deploy after new/build.',
    }),
    'invocation': flags.string({
      description: 'Sets the invocation name.',
    }),
    'skip-npminstall': flags.boolean({
      description: 'Skips npm install.',
    }),
    'language': flags.string({
      description: 'Sets the programming language of the template.',
      options: ['javascript', 'typescript'],
    }),
    'endpoint': flags.string({
      description: 'Type of endpoint',
      default: ENDPOINT_JOVOWEBHOOK,
      options: [ENDPOINT_JOVOWEBHOOK, ENDPOINT_NGROK, ENDPOINT_NONE],
    }),
    'typescript': flags.boolean({
      description: 'Sets the programming language of the template to TypeScript.',
      default: false,
    }),
    'debug': flags.boolean({
      hidden: true,
      default: false,
    }),
  };

  // Defines arguments that can be passed to the command.
  // TODO: can be required, but prompt?
  static args = [{ name: 'directory' }];

  async run() {
    try {
      platforms.addCliOptions('new', New.flags);
      addBaseCliOptions(New.flags);

      const { args, flags } = this.parse(New);

      if (!platforms.validateCliOptions('new', flags)) {
        return;
      }

      // Validation
      if (!isValidProjectName(args.directory) || !isValidTemplate(flags.template)) {
        return;
      }

      this.log(`\n jovo new: ${New.description}`);
      this.log(chalk.grey('   >> Learn more: https://jovo.tech/docs/cli/new\n'));

      // Start project initialization
      const project = getProject();
      await project.init();

      const tasks = new Listr([], {
        renderer: new JovoCliRenderer(),
        collapse: false,
      });

      const config: JovoTaskContext = {
        types: [],
        debug: flags.debug,
      };

      // Default value for directory
      args.directory = args.directory || flags.template;

      if (project.hasExistingProject(args.directory)) {
        const { overwrite } = await promptOverwriteProject();
        if (overwrite === ANSWER_CANCEL) {
          return;
        } else {
          deleteFolderRecursive(path.join(process.cwd(), args.directory));
        }
      }

      config.types = flags.build ? [flags.build] : [];

      if (flags.deploy && !flags.build) {
        this.log('Please use --build if you use --deploy');
      }

      this.log("  I'm setting everything up");
      this.log();

      const language = flags.typescript ? 'typescript' : flags.language || DEFAULT_LANGUAGE;

      _.merge(config, {
        language,
        projectName: args.directory,
        locales: project.getLocales(flags.locale),
        template: flags.template || DEFAULT_TEMPLATE,
        invocation: flags.invocation,
        endpoint: flags.endpoint || DEFAULT_ENDPOINT,
      });

      // Apply platform specific config values
      for (const type of config.types) {
        const platform = platforms.get(type);
        _.merge(config, platform.getPlatformConfigValues(project, flags));
      }

      project.setProjectPath(args.directory);

      tasks.add({
        title: `Creating new directory /${chalk.white.bold(config.projectName!)}`,
        task() {
          // TODO: async?
          return project.createEmptyProject();
        },
      });

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

      // Build project.
      if (flags.build) {
        tasks.add({
          title: 'Building project...',
          task(ctx) {
            return new Listr(buildTask(ctx));
          },
        });
      }

      // Deploy project.
      if (flags.deploy) {
        tasks.add({
          title: 'Deploying project...',
          task(ctx) {
            return new Listr(deployTask(ctx));
          },
        });
      }

      // Install npm dependencies.
      tasks.add({
        title: 'Installing npm dependencies...',
        enabled() {
          return !flags['skip-npminstall'];
        },
        async task() {
          return project.runNpmInstall();
        },
      });

      await tasks.run(config);
      this.log();
      this.log('Installation completed.');
      this.log();
    } catch (err) {
      this.error(`There was a problem:\n${err}`);
    }
  }
}
