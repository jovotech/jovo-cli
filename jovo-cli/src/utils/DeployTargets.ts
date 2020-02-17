import { JovoCliDeployLambda } from 'jovo-cli-deploy-lambda';
import {
	TARGET_MODEL,
	TARGET_INFO,
	TARGET_ZIP,
	JovoCliDeploy
} from 'jovo-cli-core';

// All deploy targets that should be available to be used
const AVAILABLE_DEPLOY_TARGETS = [JovoCliDeployLambda];

// Keeps the Deploy singletons
const instances: { [key: string]: JovoCliDeploy } = {};

/**
 * Returns all the plugin target names
 *
 * @export
 * @returns {string[]}
 */
export function getAllPluginTargets(): string[] {
	return AVAILABLE_DEPLOY_TARGETS.map(platform => platform.TARGET_KEY);
}

/**
 * Returns all the available target names
 *
 * @export
 * @returns {string[]}
 */
export function getAllAvailable(): string[] {
	const targetNames: string[] = [TARGET_MODEL, TARGET_INFO, TARGET_ZIP];
	targetNames.push(...getAllPluginTargets());
	return targetNames;
}

/**
 * Returns the deploy instance for the target with the given name
 *
 * @export
 * @param {string} name Name of the target to get
 * @returns {JovoCliPlatform}
 */
export function get(target: string): JovoCliDeploy {
	if (!instances.hasOwnProperty(target)) {
		instances[target] = createDeployInstance(target);
	}

	return instances[target];
}

/**
 * Creates a new deploy instance of the target with the given name
 *
 * @param {string} name The name of the target to create an instance of
 * @returns {JovoCliPlatform}
 */
function createDeployInstance(name: string): JovoCliDeploy {
	for (const target of AVAILABLE_DEPLOY_TARGETS) {
		if (target.TARGET_KEY === name) {
			return new target();
		}
	}

	throw new Error(`The deploy target "${name}" is not supported!`);
}
