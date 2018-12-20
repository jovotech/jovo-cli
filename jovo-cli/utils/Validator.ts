import {
	ENDPOINT_BSTPROXY,
	ENDPOINT_JOVOWEBHOOK,
	ENDPOINT_NONE,
	TARGET_ALL,
	TARGET_ZIP,
	TARGET_INFO,
	TARGET_MODEL,
} from 'jovo-cli-core';
import * as deployTargets from './DeployTargets';

import * as platforms from './Platforms';


/**
 * Checks validity of platform variable
 * @param {string} platform
 * @return {boolean}
 */
export function isValidPlatform(platform: string): boolean {

	const platformNames = platforms.getAllAvailable();

	if (platform) {
		if (!platformNames.includes(platform)) {
			console.log(`Please use a valid platform: (${platformNames.join('|')})`);
			return false;
		}
	}
	return true;
}


/**
 * Checks validity of template variable
 * @param {string} template
 * @return {boolean}
 */
export function isValidTemplate(template: string): boolean {
	if (template) {
		const reg = /^[0-9a-zA-Z-/_]+$/;
		if (!reg.test(template)) {
			console.log('Please use a valid template name.');
			return false;
		}
	}
	return true;
}

/**
 * Checks validity of locale variable
 * @param {string} locale
 * @return {boolean}
 */
export function isValidLocale(locale: string): boolean {
	if (locale) {
		if (!/[a-z]{2}-[A-Z]{2}/.test(locale)) {
			console.log('Please use a valid locale: e.g. en-US, de-DE, en-GB');
			return false;
		}
	}
	return true;
}

/**
 * Checks validity of project folder name
 * @param {string} projectName
 * @return {boolean}
 */
export function isValidProjectName(projectName: string): boolean {
	// check folder/project name validity
	const reg = /^[0-9a-zA-Z-_]+$/;
	if (!reg.test(projectName)) {
		console.log('Please use a valid folder name.');
		return false;
	}
	return true;
}

/**
 * Checks validity of target variable
 * @param {string} target
 * @return {boolean}
 */
export function isValidDeployTarget(target: string): boolean {
	if (target) {
		const availableDeployTargets = deployTargets.getAllAvailable();

		if (target !== TARGET_ALL &&
			target !== TARGET_MODEL &&
			target !== TARGET_ZIP &&
			target !== TARGET_INFO &&
			!availableDeployTargets.includes(target)) {
			console.log(`Please use a valid target: (${TARGET_MODEL}|${TARGET_INFO}|${TARGET_ZIP}|${TARGET_ALL}|${availableDeployTargets.join('|')})`);
			return false;
		}
	}
	return true;
}

/**
 * Checks validity of endpoint variable
 * @param {string} endpoint
 * @return {boolean}
 */
export function isValidEndpoint(endpoint: string): boolean {
	if (endpoint) {
		if (endpoint !== ENDPOINT_BSTPROXY &&
			endpoint !== ENDPOINT_JOVOWEBHOOK &&
			endpoint !== ENDPOINT_NONE) {
			console.log('Please use a valid endpoint: (' + ENDPOINT_JOVOWEBHOOK + '|' + ENDPOINT_BSTPROXY + ')');
			return false;
		}
	}
	return true;
}
