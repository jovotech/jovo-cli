#!/usr/bin/env node

import * as _ from 'lodash';
import Vorpal = require('vorpal');
import { Args } from 'vorpal';
import { exec } from 'child_process';

import { JovoCliRenderer } from '../utils/JovoRenderer';
import * as Listr from 'listr';
import { ListrOptionsExtended } from '../src';
import { ANSWER_UPDATE, promptUpdateVersions } from '../utils/Prompts';


const project = require('jovo-cli-core').getProject();

const dimText = require('chalk').white.dim;

import {
	addBaseCliOptions,
	getPackageVersionsNpm,
} from '../utils/Utils';


process.on('unhandledRejection', (reason, p) => {
	console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
	// Stack Trace
});


module.exports = (vorpal: Vorpal) => {
	let DEBUG = false;

	const vorpalInstance = vorpal
		.command('update')
		// @ts-ignore
		.description('Updates the Jovo modules in project to latest versions.');

	addBaseCliOptions(vorpalInstance);

	vorpalInstance
		.action(async (args: Args) => {
			try {
				DEBUG = args.options.debug ? true : false;

				// @ts-ignore
				const tasks = new Listr([], {
					renderer: JovoCliRenderer,
					collapse: false,
				} as ListrOptionsExtended);

				await project.init();

				// Check which packages our out of date
				const packageVersions = await getPackageVersionsNpm(/^jovo\-/);
				let text: string;
				const outOfDatePackages: string[] = [];
				if (Object.keys(packageVersions).length) {
					console.log('\nJovo packages of current project:');
					for (const packageName of Object.keys(packageVersions)) {
						text = `  ${packageName}: ${packageVersions[packageName].local}`;

						if (packageVersions[packageName].local !== packageVersions[packageName].npm) {
							text += dimText(` -> ${packageVersions[packageName].npm}`);
							outOfDatePackages.push(packageName);
						}
						console.log(text);
					}
				}

				if (outOfDatePackages.length === 0) {
					// Everything is up to date so nothing to do.
					console.log('\nAll packages are already up to date!\n');
					return Promise.resolve();
				}

				// Check if the update should run
				console.log('\n');
				const updateConfirmation = await promptUpdateVersions(outOfDatePackages.length).then((answers) => {
					return answers.update;
				});

				if (updateConfirmation !== ANSWER_UPDATE) {
					return Promise.resolve();
				}

				console.log('\n');

				let npmUpdateOutput = '';
				tasks.add({
					// @ts-ignore
					title: `Updating Jovo packages`,
					task: async (ctx, task) => {

						const updateCommand = 'npm update ' + Object.values(outOfDatePackages).join(' ');

						npmUpdateOutput = await new Promise<string>((resolve, reject) => {
							exec(updateCommand, {
								cwd: project.getProjectPath(),
							},
								(error, stdout) => {
									if (error) {
										console.log(error);
										reject(error);
										return;
									}

									resolve(stdout as string);
								});
						});
					},
				});

				return tasks.run()
					.then(async () => {
						console.log();
						console.log('  Update completed.');
						console.log('\n\n');
						console.log('Update output: ');
						console.log('-------------------');
						if (!npmUpdateOutput) {
							console.log('Everything is up to date!');
						} else {
							console.log(npmUpdateOutput);
						}
						console.log('\n\n');
						console.log('Changelog: https://raw.githubusercontent.com/jovotech/jovo-framework/master/CHANGELOG.md');
					})
					.catch((err) => {
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
