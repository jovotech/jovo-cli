import { JovoCliError } from './JovoCliError';

/**
 * Checks validity of a provided locale.
 * @param {string} locale - The locale to check.
 * @throws JovoCliError, if locale is not valid.
 */
export function validateLocale(locale?: string): void {
  const localeRegexp = /^[a-z]{2}-?([A-Z]{2})?$/;
  if (locale && !localeRegexp.test(locale)) {
    throw new JovoCliError({
      message: `Locale ${locale} is not valid.`,
      details: 'Valid locales are en, en-US, ...',
    });
  }
}
