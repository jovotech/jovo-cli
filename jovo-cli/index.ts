#!/usr/bin/env node

import Vorpal = require('vorpal');
const vorpal = new Vorpal();
require('dotenv').config();
import * as updateNotifier from 'update-notifier';
import { getProject } from 'jovo-cli-core';
import { getPackages } from './utils/Utils';

const project = getProject();

const pkg = require('../package.json');


async function start () {
	if (parseInt(process.version.substr(1, 2), 10) < 6) {
		console.error('Please use node version >= 6');
		process.exit(1);
	}
	const versionArg = ['-v', '-V', '--version'];

	updateNotifier({ pkg }).notify();

	// jovo  (no arguments)
	if (process.argv.length === 2) {
		process.argv.push('help');
	} else if (process.argv[2] === '--help') {
		process.argv[2] = 'help';
	}


	// check for valid Jovo project directory
	const projectLevelCommands = ['build', 'deploy', 'get', 'init', 'run', 'update'];
	if (projectLevelCommands.indexOf(process.argv[2]) !== -1 &&
		versionArg.indexOf(process.argv[2]) === -1) {

		if (!await project.isInProjectDirectory() && process.argv.indexOf('--help') === -1) {
			console.error('To use this command, please go into the directory of a valid Jovo project.');
			process.exit(1);
		}
	}

	if (process.argv.length <= 2) {
	} else if (process.argv.length === 3 &&
		(versionArg.indexOf(process.argv[2]) > -1)) {
		console.log('\nJovo CLI Version: ' + require('../package').version);

		if (await project.isInProjectDirectory()) {
			const packages = await getPackages(/^jovo\-/);
			if (Object.keys(packages).length) {
				console.log('\nJovo packages of current project:');
				for (const packageName of Object.keys(packages)) {
					console.log(`  ${packageName}: ${packages[packageName]}`);
				}
			}

		}
		console.log();
	} else {
		vorpal
			.use(require('./commands/new.js'))
			.use(require('./commands/init.js'))
			.use(require('./commands/build.js'))
			.use(require('./commands/deploy.js'))
			.use(require('./commands/get.js'))
			.use(require('./commands/run.js'))
			.use(require('./commands/update.js'))
			.delimiter('')
			.show()
			.parse(process.argv);
	}
}

start();
