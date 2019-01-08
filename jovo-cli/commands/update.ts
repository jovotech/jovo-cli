#!/usr/bin/env node

import * as _ from 'lodash';
import Vorpal = require('vorpal');
import { Args } from 'vorpal';
import { exec } from 'child_process';

import { JovoCliRenderer } from '../utils/JovoRenderer';
import * as Listr from 'listr';
import { ListrOptionsExtended } from '../src';


const project = require('jovo-cli-core').getProject();


import {
	addBaseCliOptions,
	getPackages,
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
			DEBUG = args.options.debug ? true : false;

			// @ts-ignore
			const tasks = new Listr([], {
				renderer: JovoCliRenderer,
				collapse: false,
			} as ListrOptionsExtended);

			await project.init();


			let npmUpdateOutput = '';
			tasks.add({
				// @ts-ignore
				title: `Updating JOVO packages`,
				task: async (ctx, task) => {
					const jovoPackages = await getPackages(/^jovo\-/);

					const updateCommand = 'npm --depth 99 update ' + Object.keys(jovoPackages).join(' ');

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
			.then(async() => {
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
				} else {

				}
			});
		});
};
