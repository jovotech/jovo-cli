import * as platforms from './Platforms';

/**
 * Checks validity of platform variable
 * @param {string} platform
 * @return {boolean}
 */
export function isValidProjectName(directory: string) {
  if (directory && !/^[0-9a-zA-Z-_]+$/.test(directory)) {
    console.log('Please use a valid folder name.');
    return false;
  }
  return true;
}

/**
 * Checks validity of template variable
 * @param {string} template
 * @return {boolean}
 */
export function isValidTemplate(template: string | undefined) {
  if (template && !/^[0-9a-zA-Z-/_]+$/.test(template)) {
    console.log('Please use a valid template name.');
    return false;
  }
  return true;
}

/**
 * Checks validity of locale variable
 * @param {string} locale
 * @return {boolean}
 */
export function isValidLocale(locale: string | undefined) {
  if (locale && !/^[a-z]{2}-?([A-Z]{2})?$/.test(locale)) {
    console.log('Please use a valid locale: e.g. en-US, de-DE, en-GB');
    return false;
  }
  return true;
}

/**
 * Checks validity of platform variable
 * @param {string} platform
 * @return {boolean}
 */
export function isValidPlatform(platform: string | undefined) {
  const platformNames = platforms.getAllAvailable();

  if (platform && !platformNames.includes(platform)) {
    console.log(`Please use a valid platform: (${platformNames.join('|')})`);
    return false;
  }

  return true;
}
