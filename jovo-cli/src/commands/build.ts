import * as _ from 'lodash';
import { Command, flags } from '@oclif/command';
import chalk from 'chalk';
import {
	platforms,
	deployTargets,
	prompts,
	validators,
	tasks,
	JovoCliRenderer,
	addBaseCliOptions
} from '../utils';
import {
	TARGET_ALL,
	TARGET_INFO,
	TARGET_MODEL,
	TARGET_ZIP,
	DEFAULT_TARGET,
	getProject,
	JovoTaskContext,
	DEFAULT_ENDPOINT,
	InputFlags
} from 'jovo-cli-core';
import Listr = require('listr');
import { buildTask, deployTask } from '../utils/Tasks';

const { buildReverseTask } = tasks;
const { isValidLocale, isValidPlatform } = validators;
const { promptForInit, promptOverwriteReverseBuild, ANSWER_CANCEL } = prompts;

export class Build extends Command {
	static description: 'Build platform-specific language models based on jovo models folder.';

	static examples: ['jovo build --platform alexaSkill'];

	static flags: InputFlags = {
		locale: flags.string({
			char: 'l',
			description: 'Locale of the language model.\n<en-US|de-DE|etc>',
			default: 'en-US'
		}),
		platform: flags.string({
			char: 'p',
			description: 'Specifies a build platform.',
			options: platforms.getAllAvailable()
		}),
		deploy: flags.boolean({
			char: 'd',
			description: 'Runs deploy after build.'
		}),
		reverse: flags.boolean({
			char: 'r',
			description:
				'Builds Jovo language model from platform specific language model.'
		}),
		target: flags.string({
			char: 't',
			description: 'Target of build.',
			options: [
				TARGET_ALL,
				TARGET_INFO,
				TARGET_MODEL,
				TARGET_ZIP,
				...deployTargets.getAllPluginTargets()
			],
			default: DEFAULT_TARGET
		}),
		src: flags.string({
			char: 's',
			description: 'Path to source files.\n Default: <project directory>'
		}),
		stage: flags.string({
			description: 'Takes configuration from specified stage.'
		}),
		endpoint: flags.string({
			description: 'Type of endpoint.',
			options: ['jovo-webhook', 'bst-proxy', 'ngrok', 'none'],
			default: 'jovo-webhook'
		}),
		overwrite: flags.boolean({
			description:
				'Forces overwrite of existing project for reverse build.'
		}),
		ignore: flags.string({
			description: 'Task which should be ignored.',
			options: ['model-validation', 'none'],
			default: 'none'
		}),
		debug: flags.boolean({
			hidden: true,
			default: false
		})
	};

	async run() {
		try {
			platforms.addCliOptions('build', Build.flags);
			addBaseCliOptions(Build.flags);

			const { flags } = this.parse(Build);

			if (!platforms.validateCliOptions('build', flags)) {
				this.exit();
			}

			if (
				!isValidLocale(flags.locale) ||
				!isValidPlatform(flags.platform)
			) {
				this.exit(1);
			}

			this.log(
				' jovo build:  Create and update platform specific files in /platforms folder'
			);
			this.log(
				chalk.grey('   >> Learn more: https://jovo.tech/docs/cli/build')
			);

			const project = getProject();
			await project.init();

			const tasks = new Listr([], {
				renderer: new JovoCliRenderer(),
				collapse: false,
				seperateTopTasks: true
			});

			try {
				project.getConfig(flags.stage);
			} catch (err) {
				if (flags.debug) {
					this.log(err);
				}
				this.error(`Could not load ${project.getConfigFileName()}.`);
			}

			const types: string[] = flags.platform
				? [flags.platform]
				: platforms.getAll(flags.platform, flags.stage);

			const config: JovoTaskContext = {
				types,
				locales: project.getLocales(flags.locale),
				projectId:
					// @ts-ignore
					flags['project-id'] ||
					project.jovoConfigReader!.getConfigParameter(
						'googleAction.dialogflow.projectId',
						flags.stage
					),
				endpoint: flags.endpoint || DEFAULT_ENDPOINT,
				targets: project.getTargets(
					'deploy',
					flags.target,
					flags.stage
				),
				src:
					flags.src ||
					(project.jovoConfigReader!.getConfigParameter(
						'src',
						flags.stage
					) as string) ||
					project.getProjectPath(),
				stage: project.getStage(flags.stage!),
				debug: flags.debug,
				frameworkVersion: project.frameworkVersion,
				ignoreTasks: [flags.ignore!]
			};

			if (!project.hasConfigFile()) {
				this.error(
					`The "${project.getConfigPath()}" file is missing or invalid!`
				);
			}

			// If more than one type is set and reverse selected ask the user
			// for a platform as a reverse build can only be done from one
			// as further ones would overwrite previous ones.
			if (config.types.length !== 1 && flags.reverse) {
				const { platform } = await promptForInit(
					'Please select the platform you want to reverse build from:'
				);
				config.types = [platform];
			}

			for (const type of config.types) {
				const platform = platforms.get(type);

				// Apply platform-specific config values.
				_.merge(
					config,
					// @ts-ignore
					platform.getPlatformConfigValues(project, flags)
				);

				if (flags.reverse) {
					config.locales = platform.getLocales(flags.locale);
					if (flags.overwrite) {
						config.reverse = true;
					} else if (project.hasModelFiles(config.locales)) {
						const answer = await promptOverwriteReverseBuild();
						if (
							answer.promptOverwriteReverseBuild === ANSWER_CANCEL
						) {
							this.exit();
						}
						config.reverse = answer.promptOverwriteReverseBuild;
					}
				}
			}

			if (flags.reverse) {
				tasks.add({
					title: 'Building language model platform model',
					task(ctx) {
						return buildReverseTask(ctx);
					}
				});
			} else {
				for (const task of buildTask(config)) {
					tasks.add(task);
				}

				if (flags.deploy) {
					tasks.add({
						title: 'Deploying project...',
						task(ctx) {
							return new Listr(deployTask(ctx));
						}
					});
				}
			}

			await tasks.run(config);
			this.log();
			this.log('  Build completed.');
			this.log();
		} catch (err) {
			this.error(`There was a problem:\n${err}`);
		}
	}
}
