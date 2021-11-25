import prompt from 'prompts';
import { ANSWER_BACKUP, ANSWER_CANCEL, ANSWER_OVERWRITE } from './constants';
import { printHighlight, printUserInput } from './prints';

/**
 * Prompt if existing model files should be overwritten.
 */
export async function promptOverwriteReverseBuild(): Promise<{ overwrite: string }> {
  return await prompt(
    {
      name: 'overwrite',
      type: 'select',
      message: 'Found existing model files. How do you want to proceed?',
      choices: [
        { title: printUserInput('Overwrite'), value: ANSWER_OVERWRITE },
        { title: printUserInput('Backup old files and proceed'), value: ANSWER_BACKUP },
        { title: printUserInput('Cancel'), value: ANSWER_CANCEL },
      ],
    },
    {
      onCancel() {
        process.exit();
      },
    },
  );
}

/**
 * Prompt for overwrite.
 * @param message - Message to display on prompt.
 */
export async function promptOverwrite(message: string): Promise<{ overwrite: string }> {
  return await prompt(
    {
      name: 'overwrite',
      type: 'select',
      message,
      choices: [
        {
          title: printUserInput('Overwrite'),
          value: ANSWER_OVERWRITE,
        },
        {
          title: printUserInput('Cancel'),
          value: ANSWER_CANCEL,
        },
      ],
    },
    {
      onCancel(_prompt, answers) {
        answers.overwrite = ANSWER_CANCEL;
      },
    },
  );
}

export async function promptSupportedLocales(
  locale: string,
  platform: string,
  supportedLocales: string[],
): Promise<{ locales: string[] }> {
  return await prompt(
    {
      name: 'locales',
      type: 'multiselect',
      message: `Locale ${printHighlight(
        locale,
      )} is not supported by ${platform}.\n  Please provide an alternative locale (type to filter, select with space):`,
      instructions: false,
      min: 1,
      choices: supportedLocales.map((locale) => ({
        title: printUserInput(locale),
        value: locale,
      })),
    },
    {
      onCancel() {
        process.exit();
      },
    },
  );
}
