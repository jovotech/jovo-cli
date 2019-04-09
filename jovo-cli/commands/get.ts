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
	promptListForProjectId,
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

				for (const type of config.types){
					const platform = Platforms.get(type);

					// Try to get platform id only from the files and not from the cli arguments. That is important
					// because it gets used to check if data already exists and if it should be overwritten
					let platformConfigIds = platform.getPlatformConfigIds(project, {});

					if (!args.options.overwrite && Object.keys(platformConfigIds).length) {
						const answers = await promptOverwriteProjectFiles();
						if (answers.overwrite === ANSWER_CANCEL) {
							return Promise.resolve();
						}
					}

					// Look now for the config ids also in the cli arguments
					platformConfigIds = platform.getPlatformConfigIds(project, args.options);

					_.merge(config, platformConfigIds);
					// Apply platform specific config values
					_.merge(config, platform.getPlatformConfigValues(project, args.options));
					_.merge(config, {
						locales: project.getLocales(args.options.locale),
						target: args.options.target || TARGET_ALL,
						stage: project.getStage(args.options.stage),
					});

					if (Object.keys(platformConfigIds).length === 0) {
						// If no project got found prompt user to select one
						const choices = await platform.getExistingProjects(config);
						const answers = await promptListForProjectId(choices);
						// @ts-ignore
						config[platform.constructor.ID_KEY] = answers.id;
					}

					if (args.options.reverse) {
						// take locales from alexaSkill/models directory
						try {
							config.locales = platform.getLocales(args.options.locale);
						} catch (e) {
							config.locales = undefined;
						}
						if (args.options.overwrite) {
							config.reverse = true;
						} else if (project.hasModelFiles(config.locales)) {
							const answers = await promptOverwriteReverseBuild();
							if (answers.promptOverwriteReverseBuild === ANSWER_CANCEL) {
								// exit on cancel
								return Promise.resolve();
							} else {
								config.reverse = answers.promptOverwriteReverseBuild;
							}
						}
					}

					getTask(config).forEach((t) => tasks.add(t));
				}

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

				await tasks.run(config);
				console.log();
				console.log('  Get completed.');
				console.log();
			} catch (err) {
				console.error('There was a problem:');
				console.error(err);
				process.exit(1);
			}
		});
};
