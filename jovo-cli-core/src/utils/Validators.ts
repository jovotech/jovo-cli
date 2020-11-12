import { JovoCliError } from '../JovoCliError';

/**
 * Checks validity of a provided locale.
 * @param {string} locale - The locale to check.
 */
export function validateLocale(locale?: string) {
  const localeRegexp: RegExp = /^[a-z]{2}-?([A-Z]{2})?$/;
  if (locale && !localeRegexp.test(locale)) {
    throw new JovoCliError(
      'Please use a valid locale.',
      'jovo-cli',
      'Valid locales are en, en-US, ...',
    );
  }
}
