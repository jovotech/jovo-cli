#!/usr/bin/env node

import * as _ from 'lodash';
import Vorpal = require('vorpal');
import { Args } from "vorpal";
import * as Listr from 'listr';
import * as Platforms from '../utils/Platforms';
import { ListrOptionsExtended } from '../src';
import {
	addBaseCliOptions
} from '../utils/Utils';
import {
	isValidProjectName,
	isValidTemplate,
	isValidLocale,
	isValidPlatform,
	isValidEndpoint
} from '../utils/Validator';

import * as chalk from 'chalk';
import {
	ANSWER_CANCEL,
	promptNewProject,
	promptForPlatform,
	promptOverwriteProject
} from '../utils/Prompts';

import * as Utils from '../utils/Utils';
import { JovoCliRenderer } from '../utils/JovoRenderer';


import { buildTask, initTask, deployTask } from './tasks';

import * as path from 'path';

const project = require('jovo-cli-core').getProject();

import {
	JovoTaskContext,
	DEFAULT_ENDPOINT,
	DEFAULT_TEMPLATE,
} from 'jovo-cli-core';



module.exports = (vorpal: Vorpal) => {
	let DEBUG = false;

	const vorpalInstance = vorpal
		.command('new [directory]')
		// @ts-ignore
		.description(`Create a new Jovo project`)
		.option('-t, --template <template>',
			'Name of the template. \n\t\t\t\tDefault: helloworld')
		.option('-l, --locale <locale>',
			'Locale of the language model.\n\t\t\t\t<en-US|de-DE|etc> Default: en-US')
		.option('-i, --init [platform]',
			`Runs init after new \n\t\t\t\t<${Platforms.getAllAvailable().join('|')}>`)
		.option('-b, --build [platform]',
			`Runs build after new/init. \n\t\t\t\t<${Platforms.getAllAvailable().join(' |')}>`)
		.option('-d, --deploy',
			'Runs deploy after new/init/build')
		.option('--ff [platform]',
			'Fast forward runs --init <platform> --build --deploy')
		.option('--invocation <invocation>',
			'Sets the invocation name')
		.option('--skip-npminstall',
			'Skips npm install')
		.option('--endpoint <endpoint>',
			'Type of endpoint \n\t\t\t\t<jovo-webhook|bst-proxy|ngrok|none> - Default: jovo-webhook')
		.option('--v1',
			'Create a Jovo v1 project')
		.option('\n');

	// Add additional CLI base options and the ones of platforms
	Platforms.addCliOptions('new', vorpalInstance);
	addBaseCliOptions(vorpalInstance);

	const platformFlags = ['ff', 'build'];

	vorpalInstance
		.validate((args: Args) => {
			// Validate additional CLI options of platforms
			if (!Platforms.validateCliOptions('new', args)) {
				return false;
			}

			if (args.options.v1) {
				platformFlags.push('init');
			}

			for (let i = 0; i < platformFlags.length; i++) {
				if (args.options[platformFlags[i]]) {
					// When platform is not given it will query it later if needed
					if (typeof args.options[platformFlags[i]] !== 'boolean') {
						if (!isValidPlatform(args.options[platformFlags[i]])) {
							return false;
						}
					}
				}
			}

			return isValidProjectName(args.directory) &&
				isValidTemplate(args.options.template) &&
				isValidLocale(args.options.locale) &&
				isValidEndpoint(args.options.endpoint);
		})

		.action(async (args: Args) => {
			try {
				const frameworkVersion = args.options.v1 ? 1 : 2;
				DEBUG = args.options.debug ? true : false;

				let answers;

				await project.init(frameworkVersion);

				// @ts-ignore
				const tasks = new Listr([], {
					renderer: JovoCliRenderer,
					collapse: false,
				} as ListrOptionsExtended);
				const config: JovoTaskContext = {
					types: [],
					debug: args.options.debug ? true : false,
				};


				if (!args.directory) {
					answers = await promptNewProject();
					args.directory = answers.directory;
					if (!isValidProjectName(args.directory)) {
						console.log(`The folder name "${args.directory}" is not valid`);
						return;
					}
				}


				// asks for approval when project folder exists
				if (args.directory && project.hasExistingProject(args.directory)) {
					answers = await promptOverwriteProject();

					if (answers.overwrite === ANSWER_CANCEL) {
						// exit on cancel
						return;
					} else {
						Utils.deleteFolderRecursive(path.join(process.cwd(), args.directory));
					}
				}

				if (args.options.init) {
					if (project.frameworkVersion !== 1) {
						console.error('The "init" option got deprecated and is only available for Jovo Framework v1 projects.');
						return;
					}
				}

				// Check if a platform is given if needed
				let platformIsNeeded = false;
				for (let i = 0; i < platformFlags.length; i++) {
					if (args.options.hasOwnProperty(platformFlags[i])) {
						if (typeof args.options[platformFlags[i]] === 'boolean') {
							platformIsNeeded = true;
						} else {
							config.types = [args.options[platformFlags[i]]];
							break;
						}
					}
				}

				// If not platform is given but needed get it from user
				if (platformIsNeeded === true && config.types.length === 0) {
					answers = await promptForPlatform();
					config.types = [answers.platform];
					console.log();
					console.log();
				}

				if (args.options.deploy) {
					if (!args.options.build) {
						console.log('Please use --build if you use --deploy');
						return;
					}
					if (!args.options.init) {
						console.log('Please use --init <platform> if you use --build');
						return;
					}
				}

				console.log('  I\'m setting everything up');
				console.log();
				_.merge(config, {
					projectname: args.directory,
					locales: project.getLocales(args.options.locale),
					template: args.options.template || DEFAULT_TEMPLATE,
					invocation: args.options.invocation,
					endpoint: args.options.endpoint || DEFAULT_ENDPOINT,
				});

				// Apply platform specific config values
				config.types.forEach((type: string) => {
					const platform = Platforms.get(type);
					_.merge(config, platform.getPlatformConfigValues(project, args.options));
				});

				project.setProjectPath(args.directory);
				// @ts-ignore
				config.template = config.template.replace('/', '-');
				tasks.add({
					// @ts-ignore
					title: `Creating new directory /${chalk.white.bold(config.projectname)}`,
					task: (ctx, task) => {
						return project.createEmptyProject();
					},
				});

				tasks.add({
					title:
						// @ts-ignore
						`Downloading and extracting template ${chalk.white.bold(config.template)}`,
					task: (ctx) => {
						return project.downloadAndExtract(
							ctx.projectname,
							ctx.template,
							ctx.locales[0]
						)
							.then(() => {
								return project.updateModelLocale(ctx.locales[0]);
							});
					},
				});

				// init project
				if (args.options.init || args.options.ff) {
					// init project
					tasks.add({
						title: 'Initializing',
						task: (ctx) => {
							return new Listr([initTask()]);
						},
					});
				}


				// build project
				if (args.options.build || args.options.ff) {
					// build project
					tasks.add({
						title: 'Building',
						task: (ctx) => {
							return new Listr(buildTask(ctx));
						},
					});
				}
				// deploy project
				if (args.options.deploy || args.options.ff) {
					tasks.add({
						title: 'Deploying',
						task: (ctx) => {
							return new Listr(deployTask(ctx));
						},
					});
				}

				// install npm dependencies
				tasks.add({
					title: 'Installing npm dependencies',
					enabled: () => !args.options['skip-npminstall'],
					task: () => project.runNpmInstall(),
				});

				return tasks.run(config).then(() => {
					console.log();
					console.log('  Installation completed.');
					console.log();
				}).catch((err) => {
					if (DEBUG === true) {
						console.error(err);
					}
					process.exit(1);
				});
			} catch (err) {
				// All errors here did not get caught in the above catch and did so not get displayed
				// via Listr so simply output it
				console.error('There was a problem:');
				console.error(err);
				process.exit(1);
			}
		});
};
