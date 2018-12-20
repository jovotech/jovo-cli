
import { exec } from 'child_process';
import * as _ from 'lodash';
import { Utils } from 'jovo-cli-core';
import { AskSkillList, JovoTaskContextAlexa } from '.';
import * as chalk from 'chalk';
import * as inquirer from 'inquirer';


export const DEFAULT_ASK_PROFILE = 'default';

/**
 * Returns ask error object
 * @param {string} method
 * @param {*} stderr
 * @return {Error}
 */
export function getAskError(method: string, stderr: string) {
	const badRequest = 'Error code:';
	stderr = stderr.replace(/[\x00-\x1F\x7F-\x9F]/u, '');
	if (stderr.indexOf(badRequest) > -1) {
		try {
			const json = stderr.substring(stderr.indexOf(badRequest) + badRequest.length + 4);

			const parsedMessage = JSON.parse(json);

			let customError = parsedMessage.message;

			if (parsedMessage.violations) {
				parsedMessage.violations.forEach((violation: object) => {
					customError += `\n  ${_.get(violation, 'message')}`;
				});
			}

			return new Error(method + ':' + customError);
		} catch (error) {
			return new Error(method + stderr);
		}
	}
	return new Error(stderr);
}


/**
 * Checks if ask cli is installed
 * @return {Promise<any>}
 */
export function checkAsk(): Promise<void> {
	return new Promise((resolve, reject) => {
		exec('ask -v', (error, stdout: string) => {
			if (error) {
				const msg = 'Jovo requires ASK CLI\n' +
					'Please read more: https://developer.amazon.com/docs/smapi/quick-start-alexa-skills-kit-command-line-interface.html';
				return reject(new Error(msg));
			}
			const version: string[] = stdout.split('.');
			// if (version.length < 3) {
			//     return reject(new Error('Please update ask-cli to version >= 1.1.0'));
			// }

			if (parseInt(version[0], 10) >= 1 && parseInt(version[1], 10) >= 1) {
				return resolve();
			}

			return reject(new Error('Please update ask-cli to version >= 1.1.0'));
		});
	});
}


/**
 * Generates choice list from skills
 * @param {*} json
 * @return {Array}
 */
export function prepareSkillList(askSkill: AskSkillList) {
	askSkill.skills.sort((a, b) => {
		// Turn your strings into dates, and then subtract them
		// to get a value that is either negative, positive, or zero.
		return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime();
	});
	const map = {
		development: 'dev',
	};
	const choices: Array<{
		name: string;
		value: string;
	}> = [];
	for (const item of askSkill.skills) {
		let message = '';
		const key = Object.keys(item.nameByLocale)[0];
		message += item.nameByLocale[key];
		// @ts-ignore
		const stage = map[item.stage] ? map[item.stage] : item.stage;
		// @ts-ignore
		message += ' ' + (stage === 'live' ? chalk.green(stage) : chalk.yellow(stage)) + ' ';
		message += '- ' + item.lastUpdated.substr(0, 10);
		// @ts-ignore
		message += ' ' + chalk.grey(item.skillId);

		choices.push({
			name: message,
			value: item.skillId,
		});
	}
	return choices;
}


/**
 * Creates skill in ASK
 * @param {*} config
 * @param {string} skillJsonPath
 * @return {Promise<any>}
 */
export function askApiCreateSkill(config: JovoTaskContextAlexa, skillJsonPath: string): Promise<string> {
	return new Promise((resolve, reject) => {
		exec('ask api create-skill -f "' + skillJsonPath + '" --profile ' + config.askProfile, (error, stdout, stderr) => {
			if (error) {
				if (stderr) {
					return reject(getAskError('askApiCreateSkill', stderr));
				}
			}
			const skillId = stdout.substr(stdout.indexOf('Skill ID: ') + 'Skill ID: '.length, 52).trim();
			resolve(skillId);
		});
	});
}


/**
 * Returns list of skills that are owned by the given profile
 * @param {*} config
 * @return {Promise<any>}
 */
export function askApiListSkills(config: JovoTaskContextAlexa): Promise<inquirer.ChoiceType[]> {
	const returnPromise = new Promise((resolve, reject) => {
		exec('ask api list-skills --profile ' + config.askProfile, {
		}, (error, stdout, stderr) => {
			if (error) {
				if (stderr) {
					return reject(getAskError('askApiListSkills', stderr));
				}
			}
			resolve(JSON.parse(stdout));
		});
	});

	return returnPromise.then((askSkill) => {
		return Promise.resolve(prepareSkillList(askSkill as AskSkillList));
	});
}

/**
 * Updates model of skill for the given locale
 * @param {*} config
 * @param {*} modelPath
 * @param {string} locale
 * @return {Promise<any>}
 */
export function askApiUpdateModel(config: JovoTaskContextAlexa, modelPath: string, locale: string): Promise<void> {
	return new Promise((resolve, reject) => {
		exec('ask api update-model -s ' + config.skillId + ' -f "' + modelPath + '" -l ' + locale + ' --profile ' + config.askProfile, {
		}, (error, stdout, stderr) => {
			if (error) {
				if (stderr) {
					return reject(getAskError('askApiUpdateModel', stderr));
				}
			}
			resolve();
		});
	});
}

/**
 * Updates skill information
 * @param {*} config
 * @param {string} skillJsonPath
 * @return {Promise<any>}
 */
export function askApiUpdateSkill(config: JovoTaskContextAlexa, skillJsonPath: string): Promise<void> {
	return new Promise((resolve, reject) => {
		exec('ask api update-skill -s ' + config.skillId + ' -f "' + skillJsonPath + '" --profile ' + config.askProfile, {
		}, (error, stdout, stderr) => {
			if (error) {
				if (stderr) {
					return reject(getAskError('askApiUpdateSkill', stderr));
				}
			}
			resolve();
		});
	});
}

/**
 * Gets build status of model
 * @param {*} config
 * @return {Promise<any>}
 */
export function askApiGetSkillStatus(config: JovoTaskContextAlexa): Promise<object> {
	return new Promise((resolve, reject) => {
		const command = 'ask api get-skill-status -s ' + config.skillId + ' --profile ' + config.askProfile;
		exec(command, {
		}, (error, stdout, stderr) => {
			if (error) {
				if (stderr) {
					return reject(getAskError('askApiGetSkillStatus', stderr));
				}
			}
			try {
				resolve(JSON.parse(stdout));
			} catch (error) {
				reject(error);
			}
		});
	});
}


/**
 * Saves skill information to json file
 * @param {*} config
 * @param {string} skillJsonPath
 * @return {Promise<any>}
 */
export function askApiGetSkill(config: JovoTaskContextAlexa, skillJsonPath: string): Promise<void> {
	return new Promise((resolve, reject) => {
		exec('ask api get-skill -s ' + config.skillId + ' > "' + skillJsonPath + '" --profile ' + config.askProfile, (error, stdout, stderr) => {
			if (error) {
				if (stderr) {
					return reject(getAskError('askApiGetSkill', stderr));
				}
			}
			resolve();
		});
	});
}

/**
 * Saves model to file
 * @param {*} config
 * @param {string} skillJsonPath
 * @param {string} locale
 * @return {Promise<any>}
 */
export function askApiGetModel(config: JovoTaskContextAlexa, skillJsonPath: string, locale: string): Promise<void> {
	return new Promise((resolve, reject) => {
		exec('ask api get-model -s ' + config.skillId + ' -l ' + locale + ' > "' + skillJsonPath + '" --profile ' + config.askProfile, {
		}, (error, stdout, stderr) => {
			if (error) {
				if (stderr) {
					return reject(getAskError('askApiGetModel', stderr));
				}
			}
			resolve();
		});
	});
}

/**
 * Saves model to file
 * @param {*} config
 * @return {Promise<any>}
 */
export function askApiEnableSkill(config: JovoTaskContextAlexa): Promise<void> {
	return new Promise((resolve, reject) => {
		exec('ask api enable-skill -s ' + config.skillId + ' --profile ' + config.askProfile, {
		}, (error, stdout, stderr) => {
			if (error) {
				if (stderr) {
					return reject(getAskError('askApiEnableSkill', stderr));
				}
			}
			resolve();
		});
	});
}

/**
 * Saves account linking information to file
 * @param {*} config
 * @return {Promise<any>}
 */
export function askApiGetAccountLinking(config: JovoTaskContextAlexa): Promise<string> {
	return new Promise((resolve, reject) => {
		exec('ask api get-account-linking -s ' + config.skillId + ' --profile ' + config.askProfile, {
		}, (error, stdout, stderr) => {
			if (error) {
				if (stderr && stderr.indexOf('AccountLinking is not present for given skillId') > 0) {
					resolve();
				} else if (stderr) {
					return reject(getAskError('askApiGetAccountLinking', stderr));
				}
			}
			resolve(stdout);
		});
	});
}


/**
 * Asks for model status every 5 seconds
 * Checks only status of first locale
 * @param {*} config
 * @return {Promise<any>}
 */
export function getModelStatus(config: JovoTaskContextAlexa): Promise<void> {
	return Utils.wait(5000).then(() => askApiGetSkillStatus(config)).then((status) => {
		// return Promise.reject(new Error(status));
		if (_.get(status, `interactionModel.${config.locales![0]}.lastUpdateRequest.status`) === 'IN_PROGRESS') {
			return getModelStatus(config);
		} else if (_.get(status, `interactionModel.${config.locales![0]}.lastUpdateRequest.status`) === 'SUCCEEDED') {
			Promise.resolve();
		} else {
			Promise.reject();
		}
	});
}


/**
 * Asks for skillStatus every 5 seconds
 * @param {*} config
 * @return {Promise<any>}
 */
export function getSkillStatus(config: JovoTaskContextAlexa): Promise<void> {
	return Utils.wait(5000).then(() => askApiGetSkillStatus(config)).then((status) => {
		// return Promise.reject(new Error(status));
		if (_.get(status, `manifest.lastUpdateRequest.status`) === 'IN_PROGRESS') {
			return getSkillStatus(config);
		} else if (_.get(status, `manifest.lastUpdateRequest.status`) === 'SUCCEEDED') {
			return Promise.resolve();
		} else {
			if (_.get(status, `manifest.lastUpdateRequest.status`) === 'FAILED' &&
				_.get(status, `manifest.lastUpdateRequest.errors[0].message`)) {
				return Promise.reject(
					new Error(_.get(status, `manifest.lastUpdateRequest.errors[0].message`))
				);
			}
		}
	});
}
