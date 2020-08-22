import * as _ from 'lodash';
import {
  AppFile,
  getProject,
  InputFlags,
  JovoCliPlatform,
  OutputFlags,
  JovoCliError,
} from 'jovo-cli-core';
import { JovoCliPlatformAlexa } from 'jovo-cli-platform-alexa';
import { JovoCliPlatformGoogle } from 'jovo-cli-platform-google';
import { JovoCliPlatformSpokestack } from 'jovo-cli-platform-spokestack';
import { JovoCliPlatformGoogleCA } from 'jovo-cli-platform-google-ca';

// All platforms that should be available to be used
const AVAILABLE_PLATFORMS = [
  JovoCliPlatformAlexa,
  JovoCliPlatformGoogle,
  JovoCliPlatformSpokestack,
  JovoCliPlatformGoogleCA,
];

// Keeps the Platfrom singletons
const instances: { [key: string]: JovoCliPlatform } = {};
const project = getProject();

/**
 * Returns all the available platform names
 *
 * @export
 * @returns {string[]}
 */
export function getAllAvailable() {
  const platformKeys = AVAILABLE_PLATFORMS.map((platform) => platform.PLATFORM_KEY);
  return _.uniq(platformKeys);
}

/**
 * Creates an instance of the given platform on instances[] and returns it.
 * @param platform - The platform id.
 */
export function get(platform: string): JovoCliPlatform {
  if (!instances.hasOwnProperty(platform)) {
    instances[platform] = createPlatformInstance(platform);
  }
  return instances[platform];
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

  for (const platformName of getAllAvailable()) {
    const platformInstance = get(platformName);
    try {
      if (config.hasOwnProperty(platformName)) {
        projectPlatforms.push(platformName);
      }
    } catch (err) {
      if (platformInstance.hasPlatform()) {
        projectPlatforms.push(platformName);
      }
    }
  }

  return projectPlatforms;
}

/**
 * Creates a new platform instance of the platform with the given name
 *
 * @param {string} platformKey The name of the platform to create an instance of
 * @returns {JovoCliPlatform}
 */
function createPlatformInstance(platformKey: string): JovoCliPlatform {
  const config: AppFile = project.getConfigContent();
  let nluKey = _.get(config, `${platformKey}.nlu`);
  if (typeof nluKey === 'object') {
    nluKey = nluKey.name;
  }

  const Platform =
    AVAILABLE_PLATFORMS.find((el) => el.NLU_KEY === nluKey) ||
    // If no platform with the nlu key is found, search for the default platform with no given nlu key.
    AVAILABLE_PLATFORMS.find((el) => !el.NLU_KEY && el.PLATFORM_KEY === platformKey);

  if (!Platform) {
    throw new JovoCliError(`The platform ${platformKey} is not supported!`, 'jovo-cli');
  }

  return new Platform() as JovoCliPlatform;
}

/**
 * Adds CLI options of the available platforms
 *
 * @export
 * @param {*} command The command to load the options for
 */
export function addCliOptions(command: string, options: InputFlags) {
  for (const platform of getAllAvailable()) {
    const instance = get(platform);
    instance.getAdditionalCliOptions(command, options);
  }
}

/**
 * Validates the CLI options of the available platforms
 *
 * @export
 * @param {*} command The command to check the options for
 * @returns {boolean}
 */
export function validateCliOptions(command: string, options: OutputFlags) {
  for (const platform of getAllAvailable()) {
    const instance = get(platform);
    if (!instance.validateAdditionalCliOptions(command, options)) {
      return false;
    }
  }
  return true;
}
