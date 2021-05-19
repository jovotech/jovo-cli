import { getResolvedLocales, JovoCliError, LocaleMap } from '@jovotech/cli-core';
import { readdirSync } from 'fs';
import { SupportedLocales } from './Constants';
import { SupportedLocalesType } from './Interfaces';

export * from './Interfaces';
export * from './Constants';

/**
 * Tries to get the locale from the Lex model inside of the build folder.
 * @param platformPath - Platform path of Lex models.
 * @param contextLocales - Locales specified in the current context.
 * @param localeMap - Optional locale map specified in project configuration.
 */
export function getLexLocale(
  platformPath: string,
  contextLocales: string[],
  localeMap?: LocaleMap,
): string {
  const files: string[] = readdirSync(platformPath);
  const lexLocales: string[] = files.map((file) => file.replace('.json', ''));
  const resolvedLocales: SupportedLocalesType[] = contextLocales.reduce(
    (locales: string[], locale: string) => {
      locales.push(...getResolvedLocales(locale, SupportedLocales, localeMap));
      return locales;
    },
    [],
  ) as SupportedLocalesType[];

  if (lexLocales.length > 1) {
    if (resolvedLocales.length > 1) {
      throw new JovoCliError(
        `Amazon Lex does not support multiple language models (${resolvedLocales.join(',')}).`,
        'LexCli',
        'Please provide a locale by using the flag "--locale" or in your project configuration.',
      );
    }

    if (!resolvedLocales.length) {
      throw new JovoCliError(
        'There are multiple Lex models available, however, Lex only supports one model at a time.',
        'LexCli',
        'Try building your model for only one locale or specify which model you want to use by using the flag "--locale" or in your project configuration.',
      );
    }

    const locale: string = resolvedLocales.pop()!;
    if (lexLocales.includes(locale)) {
      return locale;
    } else {
      throw new JovoCliError(`Couldn't find Lex model for locale ${locale}.`, 'LexCli');
    }
  }

  return lexLocales.pop()!;
}
