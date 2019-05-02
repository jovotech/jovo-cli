'use strict';

import * as fs from 'fs';
import { join as pathJoin, sep as pathSep } from 'path';
import * as archiver from 'archiver';
import * as _ from 'lodash';
import * as inquirer from 'inquirer';
import * as request from 'request';
import { exec } from 'child_process';
import * as admZip from 'adm-zip';
import { NativeFileInformation } from 'jovo-model';
import * as GoogleActionUtil from './GoogleActionUtil';

import { promisify } from 'util';

const readdir = promisify(fs.readdir);
const readFile = promisify(fs.readFile);


const project = require('jovo-cli-core').getProject();

import { JovoTaskContextGoogle } from '.';


/**
 * Returns the Dialogflow language files
 *
 * @export
 * @returns {Promise<NativeFileInformation[]>}
 */
export async function getPlatformFiles(): Promise<NativeFileInformation[]> {
	const platformFiles: NativeFileInformation[] = [];

	const foldersIncludeMain = [
		'entities',
		'intents',
	];

	let fileName: string;

	const platformFolderPath = getPath();
	let subfolderFiles: string[];
	for (const subfolder of foldersIncludeMain) {

		try {
			subfolderFiles = await readdir(pathJoin(platformFolderPath, subfolder));
		} catch (e) {
			// If folder does not exist skip it
			continue;
		}

		for (fileName of subfolderFiles) {
			platformFiles.push(
				{
					path: [subfolder, fileName],
					content: JSON.parse(await readFile(pathJoin(platformFolderPath, subfolder, fileName), 'utf8')),
				}
			);
		}
	}

	return platformFiles;
}


/**
 * Returns base path to DialogFlow Skill
 * @return {string}
 */
export function getPath() {
	return pathJoin(GoogleActionUtil.getPath(), 'dialogflow');
}

/**
 * Returns path to intents folder
 * @return {string}
 */
export function getIntentsFolderPath() {
	return pathJoin(getPath(), 'intents') + pathSep;
}

/**
 * Returns path to entities folder
 * @return {string}
 */
export function getEntitiesFolderPath() {
	return pathJoin(getPath(), 'entities') + pathSep;
}


/**
 * Returns path to DialogFlow package.json
 * @return {string}
 */
export function getPackageJsonPath() {
	return pathJoin(getPath(), 'package.json');
}

/**
 * package.json as object
 * @return {*}
 */
export function getPackageJson() {
	return require(getPackageJsonPath());
}

/**
 * Path to agent.json
 * @return {string}
 */
export function getAgentJsonPath() {
	return pathJoin(getPath(), 'agent.json');
}

/**
 * agent.json as object
 * @return {*}
 */
export function getAgentJson() {
	try {
		return require(getAgentJsonPath());
	} catch (error) {
		throw error;
	}
}

/**
 * Creates basic agent.json object
 * @return {*} object
 */
export function createEmptyAgentJson() {
	const agentJson = {
		description: '',
		// language: Helper.DEFAULT_LOCALE.substr(0, 2),
	};

	return agentJson;
}

/**
 * Builds agent.json from app.json
 * @param {*} ctx
 * @return {Promise<any>}
 */
export function buildDialogFlowAgent(ctx: JovoTaskContextGoogle) {
	return new Promise((resolve, reject) => {
		try {
			const config = project.getConfig(ctx.stage);

			let agent;

			try {
				agent = getAgentJson();
			} catch (err) {
				agent = createEmptyAgentJson();
			}

			// endpoint
			let url = null;
			url = _.get(config, 'googleAction.dialogflow.endpoint') ||
				_.get(config, 'endpoint.googleAction.dialogflow') ||
				_.get(config, 'endpoint');


			url = project.getEndpointFromConfig(url);
			if (url) {
				_.merge(agent, {
					'webhook': {
						url,
						available: true,
					},
				});
			}

			// setup languages
			if (ctx.locales && ctx.locales.length === 1) {
				// get primary language from locale
				let primaryLanguage = ctx.locales[0].substring(0, 2);

				// some locales work without primary language
				if (['pt-br', 'zh-cn', 'zh-hk', 'zh-tw'].indexOf(ctx.locales[0].toLowerCase()) > -1) {
					primaryLanguage = ctx.locales[0];
				}

				_.set(agent, 'language', primaryLanguage);

				delete agent.supportedLanguages;
			} else if (ctx.locales && ctx.locales.length > 1) {
				// get primary language from locale
				let primaryLanguage = ctx.locales[0].substring(0, 2);

				// get preferred primary language
				const prLanguages = ctx.locales.filter((locale) => {
					return locale.length === 2;
				});

				if (prLanguages.length === 1) {
					primaryLanguage = prLanguages[0];
				}

				// some locales work without primary language
				if (['pt-br', 'zh-cn', 'zh-hk', 'zh-tw'].indexOf(ctx.locales[0].toLowerCase()) > -1) {
					primaryLanguage = ctx.locales[0];
				}

				const supportedLanguages: string[] = [];

				// set primary language from app.json (if defined)
				primaryLanguage = _.get(config, 'googleAction.dialogflow.primaryLanguage') ||
					primaryLanguage;

				// add supportedLanguages without primaryLanguage
				ctx.locales.forEach((loc) => {
					if (loc !== primaryLanguage) {
						// @ts-ignore
						supportedLanguages.push(loc.toLowerCase());
					}
				});

				_.set(agent, 'language', primaryLanguage.toLowerCase());
				_.set(agent, 'supportedLanguages', supportedLanguages);
			}

			if (_.get(config, 'googleAction.dialogflow.agent')) {
				_.merge(agent, config.googleAction.dialogflow.agent);
			}
			// create package.json
			fs.writeFileSync(getPackageJsonPath(),
				JSON.stringify({
					version: '1.0.0',
				}, null, '\t')
			);

			fs.writeFile(getAgentJsonPath(), JSON.stringify(agent, null, '\t'), (err) => {
				if (err) {
					reject(err);
					return;
				}
				resolve();
			});
		} catch (err) {
			reject(err);
		}
	});
}

export function getDefaultIntents() {
	return [
		{
			'name': 'Default Fallback Intent',
			'auto': true,
			'webhookUsed': true,
			'fallbackIntent': true,
		},
		{
			'name': 'Default Welcome Intent',
			'auto': true,
			'webhookUsed': true,
			'events': [
				{
					'name': 'WELCOME',
				},
			],
		},
	];
}


/**
 * Archives Dialog Flow agent + models files
 * @return {Promise<any>}
 */
export function zip() {
	return new Promise((resolve, reject) => {
		const zipPath = pathJoin(GoogleActionUtil.getPath(), 'dialogflow_agent.zip');
		const output = fs.createWriteStream(zipPath);
		const archive = archiver('zip', {
			zlib: { level: 9 }, // Sets the compression level.
		});

		// listen for all archive data to be written, resolving promise once that occurs
		output.on('close', () => {
			resolve(zipPath);
		});

		output.on('end', () => {
		});

		archive.on('warning', (err) => {
			if (err.code === 'ENOENT') {
				// log warning
			} else {
				// throw error
				throw err;
			}
		});

		archive.on('error', (err) => {
			reject(err);
		});
		archive.pipe(output);
		const file1 = pathJoin(getPath(), 'package.json');
		archive.append(fs.createReadStream(file1), { name: 'package.json' });
		const file2 = pathJoin(getPath(), 'agent.json');
		archive.append(fs.createReadStream(file2), { name: 'agent.json' });

		archive.directory(getIntentsFolderPath(), 'intents');
		if (fs.existsSync(getEntitiesFolderPath())) {
			archive.directory(getEntitiesFolderPath(), 'entities');
		}

		// signal that we are done appending files and the final output can be written
		archive.finalize();
	});
}


export const v2 = {

	/**
	 * Checks if Gcloud is installed
	 * @return {Promise<any>}
	 */
	checkGcloud(): Promise<void> {
		return new Promise((resolve, reject) => {
			try {
				exec('gcloud -v', (error, stdout: string, stderr: string) => {
					if (error) {
						if (stderr) {
							return reject(new Error('Your Google Cloud SDK isn\'t installed properly'));
						}
					}
					if (!_.startsWith(stdout, 'Google Cloud SDK')) {
						return reject(new Error('Your Google Cloud SDK isn\'t installed properly'));
					}

					resolve();
				});
			} catch (error) {
				console.log(error);
			}
		});
	},


	/**
	 * Activate gcloud service account
	 * @param {*} config
	 * @return {Promise<any>}
	 */
	activateServiceAccount(config: JovoTaskContextGoogle): Promise<void> {
		return new Promise((resolve, reject) => {
			try {
				exec('gcloud auth activate-service-account --key-file="' + config.keyFile + '"', (error, stdout: string, stderr: string) => {
					if (error) {
						if (stderr || error) {
							return reject(new Error('Could not activate your service account: ' + stderr));
						}
					}
					resolve();
				});
			} catch (error) {
				console.log(error);
			}
		});
	},

	/**
	 * Retrieves access token from gcloud cli
	 * @return {Promise<any>}
	 */
	getAccessToken(): Promise<string> {
		return new Promise((resolve, reject) => {
			try {
				exec('gcloud auth print-access-token', (error, stdout: string, stderr: string) => {
					if (error) {
						if (stderr) {
							console.log(stderr);
						}
					}
					resolve(stdout);
				});
			} catch (error) {
				console.log(error);
			}
		});
	},

	/**
	 * Returns all the projects
	 * @param {*} config
	 * @return {Promise<any>}
	 */
	getProjects(): Promise<inquirer.ChoiceType[]> {
		return new Promise((resolve, reject) => {
			this.getAccessToken().then((accessToken) => {
				const options = {
					method: 'GET',
					url: `https://dialogflow.googleapis.com/v2/projects/-/agent:search`,
					headers: {
						Authorization: `Bearer ${accessToken.trim()}`,
						accept: 'application/json',
					},
				};
				request(options, (error, response: request.Response, body: string) => {
					if (error) {
						return reject(error);
					}
					if (response.body.error) {
						return reject(new Error(response.body.error.message));
					}

					try {
						const res = JSON.parse(body);

						const returnData: inquirer.ChoiceType[] = [];
						for (const project of res.agents || []) {
							returnData.push({
								name: project.displayName,
								value: project.parent.split('/')[1],
							});
						}

						return resolve(returnData);
					} catch (e) {
						return reject(new Error(`Can't parse response object`));
					}
				});
			});
		});
	},

	/**
	 * Exports agent from given project id
	 * @param {*} config
	 * @return {Promise<any>}
	 */
	exportAgent(config: JovoTaskContextGoogle): Promise<Buffer> {
		return new Promise((resolve, reject) => {
			this.getAccessToken().then((accessToken) => {
				const options = {
					method: 'POST',
					url: `https://dialogflow.googleapis.com/v2beta1/projects/${config.projectId}/agent:export`, // eslint-disable-line
					headers: {
						Authorization: `Bearer ${accessToken.trim()}`,
						accept: 'application/json',
					},
				};
				request(options, (error, response: request.Response, body: string) => {
					if (error) {
						return reject(error);
					}
					if (response.body.error) {
						return reject(new Error(response.body.error.message));
					}

					try {
						const res = JSON.parse(body);

						if (res.error) {
							return reject(new Error(res.error.message));
						}
						const buf = Buffer.from(res.response.agentContent, 'base64');

						resolve(buf);
					} catch (e) {
						return reject(new Error(`Can't parse response object`));
					}
				});
			});
		});
	},

	/**
	 * Uploads agent (zip) to Dialogflow
	 * @param {*} config
	 * @return {Promise<void>}
	 */
	restoreAgent(config: JovoTaskContextGoogle): Promise<void> {
		return new Promise((resolve, reject) => {
			this.getAccessToken().then((accessToken) => {
				const zipdata = fs.readFileSync(config.pathToZip);
				const content = {
					agentContent: new Buffer(zipdata).toString('base64'),
				};

				const options = {
					method: 'POST',
					url: `https://dialogflow.googleapis.com/v2beta1/projects/${config.projectId}/agent:restore`, // eslint-disable-line
					headers: {
						Authorization: `Bearer ${accessToken.trim()}`,
						accept: 'application/json',
						'Content-Type': 'application/json'
					},
					json: content,
				};

				request(options, (error, response, body: string) => {
					if (error) {
						return reject(error);
					}
					if (response.body.error) {
						return reject(new Error(response.body.error.message));
					}
					resolve();
				});
			});
		});
	},

	/**
	 * Starts training of agent for given project id
	 * @param {*} config
	 * @return {Promise<any>}
	 */
	trainAgent(config: JovoTaskContextGoogle) {
		return new Promise((resolve, reject) => {
			this.getAccessToken().then((accessToken) => {
				const options = {
					method: 'POST',
					url: `https://dialogflow.googleapis.com/v2beta1/projects/${config.projectId}/agent:train`, // eslint-disable-line
					headers: {
						Authorization: `Bearer ${accessToken.trim()}`,
						accept: 'application/json',
						'Content-Type': 'application/json',
					},
				};
				request(options, (error, response, body: string) => {
					if (error) {
						return reject(error);
					}
					if (response.body.error) {
						return reject(new Error(response.body.error.message));
					}
					resolve(body);
				});
			});
		});
	},
};

export function getAgentFiles(config: JovoTaskContextGoogle) {
	return v2.exportAgent(config).then((buf) => {
		const zip = new admZip(buf);
		zip.extractAllTo(getPath(), true);
	});
}
