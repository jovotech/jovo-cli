#!/usr/bin/env node

import * as _ from 'lodash';
import Vorpal = require('vorpal');
import { Args } from "vorpal";
import { JovoCliRenderer } from '../utils/JovoRenderer';

import * as Listr from 'listr';
import * as Platforms from '../utils/Platforms';
import { promptForPlatform } from '../utils/Prompts';
import * as DeployTargets from '../utils/DeployTargets';
import { ListrOptionsExtended } from '../src';
import {
	buildTask,
	initTask,
	deployTask
} from './tasks';
import {
	addBaseCliOptions
} from '../utils/Utils';
import {
	isValidPlatform,
	isValidLocale,
	isValidDeployTarget,
	isValidEndpoint,
} from '../utils/Validator';

import {
	JovoTaskContext,
	DEFAULT_ENDPOINT,
	DEFAULT_TARGET,
} from 'jovo-cli-core';

const project = require('jovo-cli-core').getProject();


module.exports = (vorpal: Vorpal) => {
	let DEBUG = false;

	const vorpalInstance = vorpal
		.command('init [platform]')
		// @ts-ignore
		.description('Initializes platform-specific projects in app.json.')
		.option('-b, --build',
			'Runs build after init.')
		.option('-d, --deploy',
			'Runs deploy after init/build')
		.option('-l, --locale <locale>',
			'Locale of the language model.\n\t\t\t\t<en-US|de-DE|etc> Default: en-US')
		.option('-t, --target <target>',
			`Target of build and deployment \n\t\t\t\t${DeployTargets.getDeployExampleText()}`)
		.option('--endpoint <endpoint>',
			'Type of endpoint \n\t\t\t\t<jovo-webhook|bst-proxy|ngrok|none> - Default: jovo-webhook')
		.option('\n');

	// Add additional CLI base options and the ones of platforms
	Platforms.addCliOptions('init', vorpalInstance);
	addBaseCliOptions(vorpalInstance);

	vorpalInstance
		.validate((args: Args) => {
			// Validate additional CLI options of platforms
			if (!Platforms.validateCliOptions('init', args)) {
				return false;
			}

			return isValidPlatform(args.platform) &&
				isValidLocale(args.options.locale) &&
				isValidDeployTarget(args.options.target) &&
				isValidEndpoint(args.options.endpoint);
		})
		.action(async (args: Args) => {
			try {
				DEBUG = args.options.debug ? true : false;

				await project.init();

				if (project.frameworkVersion !== 1) {
					console.error('The "init" command got deprecated for v2 projects as it is no longer needed.');
					return Promise.resolve();
				}

				// @ts-ignore
				const tasks = new Listr([], {
					renderer: JovoCliRenderer,
					collapse: false,
				} as ListrOptionsExtended);
				try {
					project.getConfig(args.options.stage);
				} catch (e) {
					console.log('\n\n Could not load app.json. \n\n');
					return;
				}
				let p = Promise.resolve();
				const config: JovoTaskContext = {
					types: args.platform ? [args.platform] : [],
					locales: project.getLocales(args.options.locale),
					endpoint: args.options.endpoint || DEFAULT_ENDPOINT,
					target: args.options.target || DEFAULT_TARGET,
					debug: args.options.debug ? true : false,
					frameworkVersion: project.frameworkVersion,
				};
				if (!args.platform) {
					p = p.then(() => {
						return promptForPlatform().then((answers) => {
							config.types = [answers.platform];
							console.log();
							console.log();
						});
					});
				}

				if (args.options.deploy) {
					p = p.then(() => {
						if (!args.options.build) {
							console.log('Please use --build if you use --deploy');
							return;
						}
					});
				}

				// Apply platform specific config values
				config.types.forEach((type) => {
					const platform = Platforms.get(type);
					_.merge(config, platform.getPlatformConfigValues(project, args.options));
				});


				return p.then(() => {
					tasks.add(
						initTask()
					);

					// build project
					if (args.options.build) {
						// build project
						tasks.add({
							title: 'Building',
							task: (ctx) => {
								return new Listr(buildTask(ctx));
							},
						});
					}
					// deploy project
					if (args.options.deploy) {
						tasks.add({
							title: 'Deploying',
							task: (ctx) => {
								return new Listr(deployTask(ctx));
							},
						});
					}

					return tasks.run(config).then(() => {
						console.log();
						console.log('  Initialization completed.');
						console.log();
					}).catch((err) => {
						if (DEBUG === true) {
							console.error(err);
						}
						process.exit(1);
					});
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
