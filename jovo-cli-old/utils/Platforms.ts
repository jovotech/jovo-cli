import Vorpal = require('vorpal');
import { Args } from "vorpal";

import { JovoCliPlatformAlexa } from 'jovo-cli-platform-alexa';
import { JovoCliPlatformGoogle } from 'jovo-cli-platform-google';
import { AppFile, getProject, JovoCliPlatform } from 'jovo-cli-core';

const project = getProject();

// Keeps the Platfrom singletons
const instances: { [key: string]: JovoCliPlatform } = {};


// All platforms that should be available to be used
const AVAILABLE_PLATFORMS = [
	JovoCliPlatformAlexa,
	JovoCliPlatformGoogle,
];


/**
 * Creates a new platform instance of the platform with the given name
 *
 * @param {string} name The name of the platform to create an instance of
 * @returns {JovoCliPlatform}
 */
function createPlatformInstance(name: string): JovoCliPlatform {
	name = name.toString();

	for (let i = 0; i < AVAILABLE_PLATFORMS.length; i++) {
		if (AVAILABLE_PLATFORMS[i].PLATFORM_KEY === name) {
			return new AVAILABLE_PLATFORMS[i]() as JovoCliPlatform;
		}
	}

	throw (new Error(`The platform "${name}" is not supported!`));
}


/**
 * Returns all the available platform names
 *
 * @export
 * @returns {string[]}
 */
export function getAllAvailable(): string[] {
	const platformNames: string[] = [];

	AVAILABLE_PLATFORMS.forEach((platform) => {
		platformNames.push(platform.PLATFORM_KEY);
	});

	return platformNames;
}


/**
 * Returns all the available plaforms unless when given a platform name
 * then it returns only that one
 *
 * @export
 * @param {string} [platform] Option platform name
 * @param {string} [stage] Optional stage name
 * @returns {string[]}
 */
export function getAll(platform?: string, stage?: string): string[] {
	if (platform) {
		return [platform];
	}

	const projectPlatforms: string[] = [];
	const config: AppFile = project.getConfig(stage);

	let platformInstance: JovoCliPlatform;
	getAllAvailable().forEach((platformName) => {
		platformInstance = get(platformName);
		try {
			if (config.hasOwnProperty(platformName)) {
				projectPlatforms.push(platformName);
			}
		} catch (error) {
			if (platformInstance.hasPlatform()) {
				projectPlatforms.push(platformName);
			}
		}
	});

	return projectPlatforms;
}


/**
 * Returns the platform instance for the platform with the given name
 *
 * @export
 * @param {string} name Name of the platfrom to get
 * @returns {JovoCliPlatform}
 */
export function get(name: string): JovoCliPlatform {
	if (!instances.hasOwnProperty(name)) {
		instances[name] = createPlatformInstance(name);
	}

	return instances[name];
}


/**
 * Adds CLI options of the available platforms
 *
 * @export
 * @param {*} command The command to load the options for
 * @param {*} vorpalCommand The vorpal command instance to add the options to
 */
export function addCliOptions(command: string, vorpalCommand: Vorpal.Command): void {
	let platformInstance: JovoCliPlatform;

	// Add the CLI options of each platform
	getAllAvailable().forEach((platformName) => {
		platformInstance = get(platformName);
		platformInstance.getAdditionalCliOptions(command, vorpalCommand);
	});
}


/**
 * Validates the CLI options of the available platforms
 *
 * @export
 * @param {*} command The command to check the options for
 * @param {*} args The vorpal args object
 * @returns {boolean}
 */
export function validateCliOptions(command: string, args: Args): boolean {
	let platformInstance: JovoCliPlatform;

	// Validate the CLI options of each platform
	const allPlatforms = getAllAvailable();
	for (let i = 0; i < allPlatforms.length; i++) {
		platformInstance = get(allPlatforms[i]);
		if (!platformInstance.validateAdditionalCliOptions(command, args)) {
			return false;
		}
	}

	return true;
}
