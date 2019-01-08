#!/usr/bin/env node

import * as _ from 'lodash';
import Vorpal = require('vorpal');
import { Args } from "vorpal";
import * as fs from 'fs';
import * as JovoWebhookConnector from 'jovo-webhook-connector';
import * as path from 'path';
const resolveBin = require('resolve-bin');
import * as spawn from 'cross-spawn';
import { BSTProxy } from 'bespoken-tools';
import * as Platforms from '../utils/Platforms';
import {
	addBaseCliOptions
} from '../utils/Utils';
import {
	getProject,
	Utils,
	JOVO_WEBHOOK_URL,
} from 'jovo-cli-core';

const opn = require('opn');

const { promisify } = require('util');

const accessAsync = promisify(fs.access);


const project = getProject();

if (process.argv.indexOf('run') > 0 &&
	process.argv.indexOf('help') < 0 &&
	(process.argv.length === 3 || process.argv[3].indexOf('.js') === -1)) {
	process.argv.splice(3, 0, 'index.js');
}

module.exports = (vorpal: Vorpal) => {
	let DEBUG = false;

	const vorpalCommand = vorpal
		.command('run <webhookFile>', 'run')
		.allowUnknownOptions()
		// @ts-ignore
		.description('Runs a local development server (webhook).')
		.option('-b, --bst-proxy', 'Proxies the HTTP service running at the specified port via bst')
		.option('-p, --port <port>', 'Port to local development webhook')
		.option('-i, --inspect [inspectPort]', 'Debugging port')
		.option('--stage <stage>', 'Takes configuration from <stage>')
		.option('-w, --watch', 'Uses nodemon to watch files. Restarts immediately on file change.')
		.option('--webhook-only', 'Starts the Jovo Webhook proxy without executing the code')
		.option('--tsc', 'Compile TypeScript first before execution')
		.option('--disable-jovo-debugger', 'Disables Jovo Debugger (web version)')
		.option('--model-test', 'Activates the language model test')
		.option('--timeout <timeout>', 'Sets timeout in milliseconds')
		.option('-r, --record <name>', 'Can be used to record requests and responses of your Jovo app for testing purposes.')
		.option('\n');

	// Add additional CLI base options and the ones of platforms
	Platforms.addCliOptions('run', vorpalCommand);
	addBaseCliOptions(vorpalCommand);

	vorpalCommand
		.action(async (args: Args) => {
			DEBUG = args.options.debug ? true : false;

			await project.init();

			const port = args.options.port || 3000;
			const timeout = args.options.timeout || 5000;

			const stage = project.getStage(args.options.stage);


			try {
				project.getConfig(stage);
			} catch (e) {
				console.log('\n\n Could not load app.json. \n\n');
				return Promise.resolve();
			}

			if (args.options['webhook-only']) {
				jovoWebhook({
					port,
					timeout,
				}, stage);
				return;
			}
			let srcDir;
			// prepend src directory from config
			if (project.getConfigParameter('src', stage)) {
				srcDir = project.getConfigParameter('src', stage);
				if (srcDir && !_.endsWith(path.sep, srcDir)) {
					srcDir = srcDir + path.sep;
				}
			}

			const localServerFile = args.webhookFile === 'index.js' ? 'index.js' : args.webhookFile;
			let command = 'node';
			if (args.options.watch) {
				command = resolveBin.sync('nodemon');
			}

			const checkFolders = [];


			// Check if the src folder got overwritten
			if (srcDir) {
				checkFolders.push(srcDir);
			}

			if (args.options.tsc) {
				console.log('Start compiling TypeScript...');
				await project.compileTypeScriptProject(srcDir);
				console.log('TypeScript compiling finished.\n');
			}

			if (project.frameworkVersion === 2) {
				if (await project.isTypeScriptProject()) {
					// If it is a typescript project look in "dist" folder
					checkFolders.push('./dist/');
				} else {
					// In regular projects in "src" folder
					checkFolders.push('./src/');
				}
			}

			// Check always in the current folder
			checkFolders.push('./');

			let projectFolder = undefined;
			for (let i = 0; i < checkFolders.length; i++) {
				try {
					await accessAsync(path.join(checkFolders[i], localServerFile));
					// If we are still here the file exists
					projectFolder = checkFolders[i];
					break;
				} catch(e) {}
			}

			if (projectFolder === undefined) {
				console.error('Could not find a project to run.');
				return Promise.resolve();
			}

			const parameters = [localServerFile, '--ignore', 'db/*', '--ignore', 'test/*'];

			if (args.options.record) {
				parameters.push('--record');
				parameters.push(args.options.record);
			}

			if (args.options.inspect) {
				let inspectPort = 9229;
				if (_.isNumber(args.options.inspect)) {
					inspectPort = parseInt(args.options.inspect.toString(), 10);
				}
				parameters.unshift('--inspect=' + inspectPort);
			}

			parameters.push('--webhook');

			// add project path to parameters if source path is not project path
			if (srcDir && srcDir.length > 0) {
				parameters.push('--projectDir');
				parameters.push(process.cwd());
			}

			if (stage) {
				parameters.push('--stage');
				parameters.push(stage);
			}

			if (args.options['disable-jovo-debugger']) {
				parameters.push('--disable-jovo-debugger');
			}

			if (args.options['model-test']) {
				parameters.push('--model-test');
			}

			if (args.options['bst-proxy']) {
				const proxy = BSTProxy.http(port);

				proxy.start(() => {
					const data = fs.readFileSync(path.join(Utils.getUserHome(), '.bst/config'));
					const bstConfig = JSON.parse(data.toString());

					const proxyURL = 'https://' + bstConfig.sourceID + '.bespoken.link/webhook';
					const dashboardURL = 'https://bespoken.tools/dashboard?id=' + bstConfig.sourceID + '&key=' + bstConfig.secretKey;
					let messageOutput = 'Your public URL for accessing your local service:\n';
					messageOutput += proxyURL + '\n\n';
					messageOutput += 'Your URL for viewing requests/responses sent to your service:\n';
					messageOutput += dashboardURL + '\n\n';
					messageOutput += 'Copy and paste this to your browser to view your transaction history and summary data.\n';
					console.log(messageOutput);
				});
				parameters.push('--bst-proxy');
			} else {
				jovoWebhook({
					port,
					timeout,
				}, stage);
				parameters.push('--jovo-webhook');
			}

			const ls = spawn(command, parameters, { windowsVerbatimArguments: true, stdio: 'inherit', cwd: projectFolder });

			// Ensure our child process is terminated upon exit. This is needed in the situation
			// where we're on Linux and are the child of another process (grandchild processes are orphaned in Linux).
			process.on('exit', () => {
				ls.kill();
			});

			// Return a promise which does not get resolved that the process stays alive
			return new Promise(() => {});
		});
};


/**
 * Initializes connection to the Jovo Webhook
 * @param {*} options
 * @param {string} stage
 */
function jovoWebhook(options: object, stage: string) {
	let id;

	try {
		id = project.getOrCreateJovoWebhookId();
	} catch (err) {
		console.log('Warning: Please initialize your project: $ jovo init');
		return;
	}

	try {
		if (!project.getConfigParameter('endpoint', stage)) {
			// throw new Error('Warning: You haven\'t defined an endpoint in your app.json yet.');
		}

		if (_.startsWith(project.getConfigParameter('endpoint', stage), 'arn')) {
			throw new Error('Warning: Your endpoint is a lambda endpoint. Lambda isn\'t supported with jovo webhook');
		}
	} catch (err) {
		if (_.startsWith(err.message, 'Warning:')) {
			console.log(err.message);
		}
	}

	// Open socket redirect from server to localhost
	JovoWebhookConnector.open(id, JOVO_WEBHOOK_URL, { post: options });

	const debuggerUrl = `${JOVO_WEBHOOK_URL}/${id}`;
	if (Boolean(process.stdout.isTTY)) {
		if (process.stdin.setRawMode) {
			setTimeout(() => {
				console.log('\nTo open Jovo Debugger in your browser, enter .\n');
			}, 2500);

			process.stdin.setRawMode(true);
			process.stdin.resume();
			process.stdin.setEncoding('utf8');
			process.stdin.on("data", async (key) => {
				if (key === '.') {
					try {
						await opn(debuggerUrl);
					} catch (e) {
						console.log('\nCould not open browser. Please open debugger manually by visiting this url:');
						console.log(debuggerUrl);
					}
				}
			});
		} else {
			setTimeout(() => {
				console.log(`\nTo open Jovo Debugger open this url in your browser:\n${debuggerUrl}\n`);
			}, 2500);
		}
	}
}
