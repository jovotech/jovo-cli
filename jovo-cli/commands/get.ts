#!/usr/bin/env node

import * as _ from 'lodash';
import Vorpal = require('vorpal');
import { Args } from "vorpal";
import { JovoCliRenderer } from '../utils/JovoRenderer';
import * as Listr from 'listr';
import * as Platforms from '../utils/Platforms';
import * as DeployTargets from '../utils/DeployTargets';
import {
	ANSWER_CANCEL,
	promptOverwriteProjectFiles,
	promptListForSkillId,
	promptOverwriteReverseBuild
} from '../utils/Prompts';

import { ListrOptionsExtended } from '../src';
import {
	buildReverseTask,
	getTask
} from './tasks';
import {
	addBaseCliOptions
} from '../utils/Utils';
import {
	isValidLocale,
	isValidDeployTarget,
} from '../utils/Validator';
import {
	getProject,
	JovoTaskContext,
	TARGET_ALL,
} from 'jovo-cli-core';

const project = getProject();

module.exports = (vorpal: Vorpal) => {
	let DEBUG = false;

	const vorpalInstance = vorpal
		.command('get <platform>')
		// @ts-ignore
		.description('Downloads an existing platform project into the platforms folder.')
		.option('-l, --locale <locale>',
			'Locale of the language model.\n\t\t\t\t<en-US|de-DE|etc> Default: all locales')
		.option('\n')
		.option('-t, --target <target>',
			`Type of data that is downloaded. \n\t\t\t\t${DeployTargets.getDeployExampleText()}`)
		.option('--stage <stage>',
			'Takes configuration from <stage>')
		.option('-b, --build',
			'Runs build after get. Works only with --reverse')
		.option('-r, --reverse',
			'Builds Jovo language model from platfrom specific language model')
		.option('--overwrite',
			'Forces overwrite of existing project')
		.option('\n');

	// Add additional CLI base options and the ones of platforms
	Platforms.addCliOptions('get', vorpalInstance);
	addBaseCliOptions(vorpalInstance);

	vorpalInstance
		.validate((args: Args) => {
			// Validate additional CLI options of platforms
			if (!Platforms.validateCliOptions('get', args)) {
				return false;
			}

			return isValidLocale(args.options.locale) &&
				isValidDeployTarget(args.options.target);
		})
		.action(async (args: Args) => {
			try {
				DEBUG = args.options.debug ? true : false;

				await project.init();

				let p: Promise<void | JovoTaskContext> = Promise.resolve();
				const types: string[] = [];
				if (args.platform) {
					types.push(args.platform);
				} else {
					types.push.apply(types, Platforms.getAll(args.platform, args.options.stage));
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
					return Promise.resolve();
				}
				const config: JovoTaskContext = {
					types,
					debug: DEBUG,
				};


				config.types.forEach((type) => {
					const platform = Platforms.get(type);

					// Try to get platform id only from the files and not from the cli arguments. That is important
					// because it gets used to check if data already exists and if it should be overwritten
					let platformConfigIds = platform.getPlatformConfigIds(project, {});

					if (!args.options.overwrite && Object.keys(platformConfigIds).length) {
						p = p.then(() => {
							return promptOverwriteProjectFiles().then((answers) => {
								if (answers.overwrite === ANSWER_CANCEL) {
									p = Promise.resolve();
								} else {
									return Promise.resolve();
								}
							});
						});
					}

					// Look now for the config ids also in the cli arguments
					platformConfigIds = platform.getPlatformConfigIds(project, args.options);

					p = p.then(() => {
						_.merge(config, platformConfigIds);
						// Apply platform specific config values
						_.merge(config, platform.getPlatformConfigValues(project, args.options));
						_.merge(config, {
							locales: project.getLocales(args.options.locale),
							target: args.options.target || TARGET_ALL,
							stage: project.getStage(args.options.stage),
						});

						let subp = Promise.resolve();
						if (Object.keys(platformConfigIds).length === 0) {
							// If no project got found prompt user to select one
							subp = subp
								.then(() => platform.getExistingProjects(config))
								.then((choices) => promptListForSkillId(choices)).then((answers) => {
									config.skillId = answers.skillId;
								})
								.catch((error) => {
									console.log(error.message);
									p = subp = Promise.resolve();
								});
						}


						if (args.options.reverse) {
							// take locales from alexaSkill/models directory
							subp = subp.then(() => {
								try {
									config.locales = platform.getLocales(args.options.locale);
								} catch (e) {
									config.locales = undefined;
								}
								if (args.options.overwrite) {
									config.reverse = true;
								} else if (project.hasModelFiles(config.locales)) {
									return promptOverwriteReverseBuild().then((answers) => {
										if (answers.promptOverwriteReverseBuild ===
											ANSWER_CANCEL) {
											// exit on cancel
											p = subp = Promise.resolve();
										} else {
											config.reverse = answers.promptOverwriteReverseBuild;
										}
									});
								}
							});
						}

						getTask(config).forEach((t) => tasks.add(t));
						return subp.then(() => Promise.resolve(config));
					});
				});

				return p.then((config) => {
					if (args.options.build &&
						args.options.reverse) {
						// build project
						tasks.add(
							{
								title: 'Building language model platform model',
								task: (ctx) => buildReverseTask(ctx),
							}
						);
					}

					return tasks.run(config).then(() => {
						console.log();
						console.log('  Get completed.');
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
