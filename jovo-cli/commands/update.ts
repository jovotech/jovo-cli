#!/usr/bin/env node

import * as _ from 'lodash';
import Vorpal = require('vorpal');
import { Args } from 'vorpal';
import { exec } from 'child_process';

const { promisify } = require('util');

import * as fs from 'fs';
const readFileAsync = promisify(fs.readFile);

import { join as pathJoin } from 'path';
import { JovoCliRenderer } from '../utils/JovoRenderer';
import * as Listr from 'listr';
import { ListrOptionsExtended } from '../src';


const project = require('jovo-cli-core').getProject();


import {
	addBaseCliOptions
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


			let oupdateOutput = '';
			tasks.add({
				// @ts-ignore
				title: `Updating JOVO packages`,
				task: async (ctx, task) => {
					// Find all the jovo-packages in the project to update
					const projectPath = project.getProjectPath();
					const packagePath = pathJoin(projectPath, 'package.json');
					const content = await readFileAsync(packagePath);
					const packageFile = JSON.parse(content);

					const jovoPackages: string[] = [];
					Object.keys(packageFile.dependencies).forEach((packageName) => {
						if (packageName.indexOf('jovo-') === 0) {
							jovoPackages.push(packageName);
						}
					});

					const updateCommand = 'npm --depth 99 update ' + jovoPackages.join(' ');

					oupdateOutput = await new Promise((resolve, reject) => {
						exec(updateCommand, {
							cwd: projectPath,
						},
							(error, stdout) => {
								if (error) {
									console.log(error);
									reject(error);
									return;
								}

								resolve(stdout);
							});
					});
				},
			});

			return tasks.run()
			.then(async() => {
				console.log();
				console.log('  Update completed.');
				console.log('\n\n');
				console.log('  Update output: ');
				console.log('  -------------------');
				if (!oupdateOutput) {
					console.log('  Everything is up to date!');
				} else {
					console.log(oupdateOutput);
				}
				console.log('\n\n');
				console.log('  Changelog: https://raw.githubusercontent.com/jovotech/jovo-framework/master/CHANGELOG.md');
			})
			.catch((err) => {
				if (DEBUG === true) {
					console.error(err);
				} else {

				}
			});
		});
};
