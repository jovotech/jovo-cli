#!/usr/bin/env node

import * as _ from 'lodash';
import Vorpal = require('vorpal');
import { Args } from "vorpal";
import { JovoCliRenderer } from '../utils/JovoRenderer';
import * as Listr from 'listr';
import * as Platforms from '../utils/Platforms';
import * as DeployTargets from '../utils/DeployTargets';
import { deployTask } from './tasks';
import { ListrOptionsExtended } from '../src';

import {
	addBaseCliOptions
} from '../utils/Utils';
import {
	isValidLocale,
	isValidDeployTarget,
	isValidPlatform,
} from '../utils/Validator';
import {
	getProject,
	JovoTaskContext,
	DEFAULT_TARGET,
} from 'jovo-cli-core';

const project = getProject();

process.on('unhandledRejection', (reason, p) => {
	console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
	// Stack Trace
});


module.exports = (vorpal: Vorpal) => {
	let DEBUG = false;

	const availableDeployTargets = DeployTargets.getAllAvailable();

	const vorpalInstance = vorpal
		.command('deploy')
		// @ts-ignore
		.description('Deploys the project to the voice platform.')
		.option('-l, --locale <locale>',
			'Locale of the language model.\n\t\t\t\t<en-US|de-DE|etc> Default: en-US')
		.option('-p, --platform <platform>',
			`Platform \n\t\t\t\t <${Platforms.getAllAvailable().join('|')}>`)
		.option('-t, --target <target>',
			`Target of deployment \n\t\t\t\t${DeployTargets.getDeployExampleText()}`)
		.option('--stage <stage>',
			'Takes configuration from <stage>')
		.option('-s, --src <src>',
			'Path to source files \n\t\t\t\t Default: <project directory>')
		.option('\n');

	// Add additional CLI base options and the ones of platforms
	Platforms.addCliOptions('deploy', vorpalInstance);
	addBaseCliOptions(vorpalInstance);

	vorpalInstance
		.validate((args: Args) => {
			// Validate additional CLI options of platforms
			if (!Platforms.validateCliOptions('deploy', args)) {
				return false;
			}

			return isValidLocale(args.options.locale) &&
				isValidDeployTarget(args.options.target) &&
				isValidPlatform(args.options.platform);
		})
		.action(async (args: Args) => {
			try {
				DEBUG = args.options.debug ? true : false;
				await project.init();

				// @ts-ignore
				const tasks = new Listr([], {
					renderer: JovoCliRenderer,
					collapse: false,
				} as ListrOptionsExtended);
				const config: JovoTaskContext = {
					locales: project.getLocales(args.options.locale),
					types: Platforms.getAll(args.options.platform, args.options.stage),
					target: args.options.target || DEFAULT_TARGET,
					src: args.options.src || project.getConfigParameter('src', args.options.stage) || project.getProjectPath(),
					stage: project.getStage(args.options.stage),
					debug: args.options.debug ? true : false,
					frameworkVersion: project.frameworkVersion,
				};

				if (config.types.length === 0 && (!config.target || config.target && !availableDeployTargets.includes(config.target))) {
					console.log(`Couldn't find a platform. Please use init <platform> or get to retrieve platform files.`); // eslint-disable-line
					return Promise.resolve();
				}

				// Apply platform specific ids and config values
				config.types.forEach((type: string) => {
					const platform = Platforms.get(type);
					_.merge(config, platform.getPlatformConfigIds(project, args.options));
					_.merge(config, platform.getPlatformConfigValues(project, args.options));
				});

				deployTask(config).forEach((t) => tasks.add(t));

				return tasks.run(config).then(() => {
					// @ts-ignore
					if (tasks.tasks.length > 0) {
						console.log();
						console.log('  Deployment completed.');
						console.log();
					}
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
