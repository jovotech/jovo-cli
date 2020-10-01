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
