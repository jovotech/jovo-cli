import { Command, flags } from '@oclif/command';
import * as path from 'path';
import * as Listr from 'listr';
import chalk from 'chalk';
import * as _ from 'lodash';
import {
	ENDPOINT_BSTPROXY,
	ENDPOINT_JOVOWEBHOOK,
	ENDPOINT_NGROK,
	ENDPOINT_NONE,
	getProject,
	JovoTaskContext,
	DEFAULT_TEMPLATE,
	DEFAULT_LANGUAGE,
	DEFAULT_ENDPOINT,
	InputFlags
} from 'jovo-cli-core';
import {
	validators,
	platforms,
	prompts,
	JovoCliRenderer,
	deleteFolderRecursive,
	tasks,
	addBaseCliOptions
} from '../utils';
const { ANSWER_CANCEL, promptNewProject, promptOverwriteProject } = prompts;
const { isValidProjectName, isValidTemplate } = validators;
const { buildTask, deployTask } = tasks;

export default class New extends Command {
	// Prints out a description for this command.
	static description = 'Creates a new Jovo project.';

	// Prints out examples for this command.
	static examples = ['jovo new jovo-example-project'];

	// Defines flags for this command, such as --help.
	static flags: InputFlags = {
		template: flags.string({
			char: 't',
			description: 'Name of the template.',
			default: 'helloworld'
		}),
		locale: flags.string({
			char: 'l',
			// TODO: Options -> regex for locales?
			description: 'Locale of the language model\n<en-US|de-DE|etc>',
			default: 'en-US'
		}),
		build: flags.string({
			description: 'Runs build after new',
			options: platforms.getAllAvailable()
		}),
		deploy: flags.boolean({
			description: 'Runs deploy after new/build.'
		}),
		invocation: flags.string({
			description: 'Sets the invocation name.'
		}),
		'skip-npminstall': flags.boolean({
			description: 'Skips npm install.'
		}),
		language: flags.string({
			description: 'Sets the programming language of the template.',
			options: ['javascript', 'typescript'],
			default: 'javascript'
		}),
		endpoint: flags.string({
			description: 'Type of endpoint',
			default: ENDPOINT_JOVOWEBHOOK,
			options: [
				ENDPOINT_BSTPROXY,
				ENDPOINT_JOVOWEBHOOK,
				ENDPOINT_NGROK,
				ENDPOINT_NONE
			]
		}),
		debug: flags.boolean({
			hidden: true,
			default: false
		})
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
				this.exit();
			}

			// Validation
			if (
				!isValidProjectName(args.directory) ||
				!isValidTemplate(flags.template)
			) {
				this.exit(1);
			}

			// Start project initialization
			const project = getProject();
			// TODO: framework version?
			await project.init();

			const tasks = new Listr([], {
				renderer: new JovoCliRenderer(),
				collapse: false
			});

			const config: JovoTaskContext = {
				types: [],
				debug: flags.debug
			};

			if (!args.directory) {
				const { directory } = await promptNewProject();
				if (!isValidProjectName(directory)) {
					this.error(`The folder name "${directory}" is not valid.`);
				}
				args.directory = directory;
			}

			if (project.hasExistingProject(args.directory)) {
				const { overwrite } = await promptOverwriteProject();
				if (overwrite === ANSWER_CANCEL) {
					this.exit();
				} else {
					deleteFolderRecursive(
						path.join(process.cwd(), args.directory)
					);
				}
			}

			config.types = flags.build ? [flags.build] : [];

			if (flags.deploy && !flags.build) {
				this.log('Please use --build if you use --deploy');
			}

			this.log("  I'm setting everything up");
			this.log();

			_.merge(config, {
				projectName: args.directory,
				locales: project.getLocales(flags.locale),
				template: flags.template || DEFAULT_TEMPLATE,
				language: flags.language || DEFAULT_LANGUAGE,
				invocation: flags.invocation,
				endpoint: flags.endpoint || DEFAULT_ENDPOINT
			});

			// Apply platform specific config values
			for (const type of config.types) {
				const platform = platforms.get(type);
				_.merge(
					config,
					platform.getPlatformConfigValues(project, args.options)
				);
			}

			project.setProjectPath(args.directory);
			config.template = config.template!.replace('/', '-');

			tasks.add({
				title: `Creating new directory /${chalk.white.bold(
					config.projectName!
				)}`,
				task() {
					// TODO: async?
					return project.createEmptyProject();
				}
			});

			tasks.add({
				title: `Downloading and extracting template ${chalk.white.bold(
					config.template
				)}`,
				async task(ctx) {
					// TODO: ctx should be empty?
					await project.downloadAndExtract(
						ctx.projectName,
						ctx.template,
						ctx.locales[0],
						ctx.language
					);

					await project.updateModelLocale(ctx.locales[0]);
				}
			});

			// Build project.
			if (flags.build) {
				tasks.add({
					title: 'Building project...',
					task(ctx) {
						return new Listr(buildTask(ctx));
					}
				});
			}

			// Deploy project.
			if (flags.deploy) {
				tasks.add({
					title: 'Deploying project...',
					task(ctx) {
						return new Listr(deployTask(ctx));
					}
				});
			}

			// Install npm dependencies.
			tasks.add({
				title: 'Installing npm dependencies...',
				enabled() {
					return !flags['skip-npminstall'];
				},
				async task() {
					return await project.runNpmInstall();
				}
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
