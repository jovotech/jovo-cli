#!/usr/bin/env node

import * as _ from 'lodash';
import Vorpal = require('vorpal');
import { Args } from 'vorpal';
import { exec } from 'child_process';
import * as request from 'request';

const { promisify } = require('util');

import * as fs from 'fs';
const readFileAsync = promisify(fs.readFile);

import { join as pathJoin, sep as pathSep, parse as pathParse } from 'path';
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
		.description('Update the CLI to latest version.');

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

			// Start to get the changelog but do not wait till ready that we can directly start with the update in the meantime
			const changeLogUrl = 'https://raw.githubusercontent.com/jovotech/jovo-framework/master/CHANGELOG.md';
			const changeLogPromise = new Promise((resolve, reject) => {
				request(changeLogUrl, (error, response, body) => {
					if (error) {
						return reject(new Error(error.message));
					}

					return resolve(body);
				});
			});


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
				console.log('\n\n\n');
				console.log('Update output: ');
				console.log('-------------------');
				console.log(oupdateOutput);
				console.log('\n\n\n');
				const changelog = await changeLogPromise;
				console.log(changelog);
			})
			.catch((err) => {
				if (DEBUG === true) {
					console.error(err);
				} else {

				}
			});
		});
};
