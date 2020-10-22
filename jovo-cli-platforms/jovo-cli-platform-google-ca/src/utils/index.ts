import { JovoCliError } from 'jovo-cli-core';
import * as _ from 'lodash';

import { GActionsError } from './Interfaces';
import { JovoCliPlatformGoogleCA } from '../Platform';

export * from './Interfaces';

export const GOOGLE_ACTIONS_TEST_HINT =
  'If you want to test your changes, run "gactions deploy preview", or navigate to the Test section in the Console.';

export function getGActionsError(errMessage: string): JovoCliError | undefined {
  const regex: RegExp = /{(.|\n)*}/g;

  const match = errMessage.match(regex);

  if (!match) {
    // Parse error-specific messages.
    if (errMessage.includes('command requires authentication')) {
      return new JovoCliError(
        'Missing authentication for pushing your project files.',
        JovoCliPlatformGoogleCA.PLATFORM_ID,
        'Try to run "gactions login" first.',
      );
    }

    return new JovoCliError(errMessage, JovoCliPlatformGoogleCA.PLATFORM_ID);
  }

  const error: GActionsError = JSON.parse(match[0]).error;
  return new JovoCliError(
    error.message,
    JovoCliPlatformGoogleCA.PLATFORM_ID,
    _.get(error, 'details[0].fieldViolations[0].description'),
  );
}

/**
 * Validates and parses version numbers to the following format: [major, minor, buildNumber].
 * @param version - The version as a string.
 */
export function parseVersionNumbers(version: string): string[] {
  const regexp: RegExp = /^(\d+)\.(\d+)\.(\d+)/g;
  const versionNumbers: string[] = [];
  const match = regexp.exec(version);

  if (!match) {
    throw new JovoCliError(
      `gactions CLI has an invalid version ${version}.`,
      JovoCliPlatformGoogleCA.PLATFORM_ID,
    );
  }

  match.shift();
  versionNumbers.push(...match);

  return versionNumbers;
}

/**
 * Checks if a provided version is higher than/equal to a target version.
 * @param version - The version to check.
 * @param targetVersion - The target version to check against.
 * @returns boolean - True if the version is higher or equal to the target version, false otherwise.
 */
export function matchesVersion(version: string, targetVersion: string): boolean {
  const versionNumbers = parseVersionNumbers(version);
  const targetVersionNumbers: string[] = parseVersionNumbers(targetVersion);

  for (let i = 0; i < 3; i++) {
    if (parseInt(versionNumbers[i]) < parseInt(targetVersionNumbers[i])) {
      return false;
    }

    if (parseInt(versionNumbers[i]) > parseInt(targetVersionNumbers[i])) {
      return true;
    }
  }

  return true;
}
