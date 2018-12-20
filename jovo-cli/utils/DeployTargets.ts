import { JovoCliDeployLambda } from 'jovo-cli-deploy-lambda';
import {
	JovoCliDeploy,
	TARGET_ALL,
	TARGET_ZIP,
	TARGET_INFO,
	TARGET_MODEL,
	DEFAULT_TARGET,
} from 'jovo-cli-core';
import * as DeployTargets from '../utils/DeployTargets';

// Keeps the Deploy singletons
const instances: { [key: string]: JovoCliDeploy } = {};

// All deploy targets that should be available to be used
const AVAILABLE_DEPLOY_TARGETS = [
	JovoCliDeployLambda,
];


/**
 * Creates a new deploy instance of the target with the given name
 *
 * @param {string} name The name of the target to create an instance of
 * @returns {JovoCliPlatform}
 */
function createDeployInstance(name: string): JovoCliDeploy {
	name = name.toString();

	for (let i = 0; i < AVAILABLE_DEPLOY_TARGETS.length; i++) {
		if (AVAILABLE_DEPLOY_TARGETS[i].TARGET_KEY === name) {
			return new AVAILABLE_DEPLOY_TARGETS[i]();
		}
	}

	throw (new Error(`The deploy target "${name}" is not supported!`));
}


/**
 * Returns the deploy target example text
 */
export function getDeployExampleText(): string {
	const availableDeployTargets = DeployTargets.getAllAvailable();
	return `<${TARGET_MODEL}|${TARGET_INFO}|${TARGET_ZIP}|${TARGET_ALL}|${availableDeployTargets.join('|')}> Default: ${DEFAULT_TARGET}`;
}


/**
 * Returns all the available target names
 *
 * @export
 * @returns {string[]}
 */
export function getAllAvailable(): string[] {
	const targetNames: string[] = [];

	AVAILABLE_DEPLOY_TARGETS.forEach((platform) => {
		targetNames.push(platform.TARGET_KEY);
	});

	return targetNames;
}


/**
 * Returns the deploy instance for the target with the given name
 *
 * @export
 * @param {string} name Name of the target to get
 * @returns {JovoCliPlatform}
 */
export function get(name: string): JovoCliDeploy {
	if (!instances.hasOwnProperty(name)) {
		instances[name] = createDeployInstance(name);
	}

	return instances[name];
}
