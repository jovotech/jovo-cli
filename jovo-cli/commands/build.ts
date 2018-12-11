#!/usr/bin/env node

import * as _ from 'lodash';
import Vorpal = require('vorpal');
import { Args } from "vorpal";
import { JovoCliRenderer } from '../utils/JovoRenderer';
import * as Listr from 'listr';
import * as DeployTargets from '../utils/DeployTargets';
import { ListrOptionsExtended } from '../src';
import * as Platforms from '../utils/Platforms';
import {
	addBaseCliOptions
} from '../utils/Utils';
import {
	ANSWER_CANCEL,
	promptForInit,
	promptOverwriteReverseBuild
} from '../utils/Prompts';
import {
	isValidLocale,
	isValidPlatform
} from '../utils/Validator';
import {
	getProject,
	JovoTaskContext,
	DEFAULT_ENDPOINT,
	DEFAULT_TARGET,
} from 'jovo-cli-core';
import { buildReverseTask, buildTask, deployTask, initTask } from './tasks';

const project = getProject();


module.exports = (vorpal: Vorpal) => {
	let DEBUG = false;

	const vorpalInstance = vorpal
		.command('build')
		// @ts-ignore
		.description('Build platform-specific language models based on jovo models folder.')
		.option('-l, --locale <locale>',
			'Locale of the language model.\n\t\t\t\t<en-US|de-DE|etc> Default: en-US')
		.option('-p, --platform <platform>',
			`Platform \n\t\t\t\t <${Platforms.getAllAvailable().join('|')}>`)
		.option('-d, --deploy',
			'Runs deploy after build')
		.option('-r, --reverse',
			'Builds Jovo language model from platfrom specific language model')
		.option('-t, --target <target>',
			`Target of build \n\t\t\t\t${DeployTargets.getDeployExampleText()}`)
		.option('-s, --src <src>',
			'Path to source files \n\t\t\t\t Default: <project directory>')
		.option('--stage <stage>',
			'Takes configuration from <stage>')
		.option('--endpoint <endpoint>',
			'Type of endpoint \n\t\t\t\t<jovo-webhook|bst-proxy|ngrok|none> - Default: jovo-webhook')
		.option('\n');

	// Add additional CLI base options and the ones of platforms
	Platforms.addCliOptions('build', vorpalInstance);
	addBaseCliOptions(vorpalInstance);

	vorpalInstance
		.validate((args: Args) => {
			// Validate additional CLI options of platforms
			if (!Platforms.validateCliOptions('build', args)) {
				return false;
			}

			return isValidLocale(args.options.locale) &&
				isValidPlatform(args.options.platform);
		})
		.action(async (args: Args) => {
			DEBUG = args.options.debug ? true : false;
			let answers;

			await project.init();

			// @ts-ignore
			const tasks = new Listr([], {
				renderer: JovoCliRenderer,
				collapse: false,
			} as ListrOptionsExtended);
			try {
				project.getConfig(args.options.stage);
			} catch (e) {
				console.log(`\n\n Could not load ${project.getConfigFileName()}. \n\n`);
				return Promise.resolve();
			}

			const types: string[] = [];
			if (args.options.platform) {
				types.push(args.options.platform);
			} else {
				types.push.apply(types, Platforms.getAll(args.platform, args.options.stage));
			}

			const config: JovoTaskContext = {
				locales: project.getLocales(args.options.locale),
				types,
				projectId: args.options['project-id'] || project.getConfigParameter('googleAction.dialogflow.projectId', args.options.stage),
				endpoint: args.options.endpoint || DEFAULT_ENDPOINT,
				target: args.options.target || DEFAULT_TARGET,
				src: args.options.src || project.getConfigParameter('src', args.options.stage) || project.getProjectPath(),
				stage: project.getStage(args.options.stage),
				debug: DEBUG,
				frameworkVersion: project.frameworkVersion,
			};

			// run init if necessary
			if (!project.hasConfigFile()) {
				if (project.frameworkVersion === 1) {
					if (config.types && config.types.length === 0) {
						answers = await promptForInit();
						config.types = [answers.platform];
					}
				} else {
					console.error(`The "${project.getConfigPath()}" file is missing or invalid!`);
					return;
					// return Promise.resolve();
				}
			}

			if (config.types.length !== 1 && args.options.reverse) {
				// If more than one type is set and reverse selected ask the user
				// for a platform as a reverse build can only be done from one
				// as further ones would overwrite previous ones.
				answers = await promptForInit();
				config.types = [answers.platform];
			}

			for (const type of config.types) {
				const platform = Platforms.get(type);

				// Apply platform specific config values
				_.merge(config, platform.getPlatformConfigValues(project, args));
				if (args.options.reverse) {

					const platform = Platforms.get(type);
					config.locales = platform.getLocales(args.options.locale);

					if (project.hasModelFiles(config.locales)) {
						answers = await promptOverwriteReverseBuild();

						if (answers.promptOverwriteReverseBuild === ANSWER_CANCEL) {
							// exit on cancel
							return;
						} else {
							config.reverse = answers.promptOverwriteReverseBuild;
						}
					}
				}
			}


			if (!project.hasConfigFile() && !args.options.reverse) {
				tasks.add(
					initTask()
				);
			}

			if (args.options.reverse) {
				tasks.add(
					{
						title: 'Building language model platform model',
						task: (ctx) => buildReverseTask(ctx),
					}
				);
			} else {
				// build project
				buildTask(config).forEach((t) => tasks.add(t));
				// deploy project
				if (args.options.deploy) {
					tasks.add({
						title: 'Deploying',
						task: (ctx) => {
							return new Listr(deployTask(ctx));
						},
					});
				}
			}
			return tasks.run(config).then(() => {
				console.log();
				console.log('  Build completed.');
				console.log();
			}).catch((err) => {
				if (DEBUG === true) {
					console.error(err);
				}
			});
		});
};
