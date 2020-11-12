import { prompt } from 'enquirer';
import { ANSWER_BACKUP, ANSWER_CANCEL, ANSWER_OVERWRITE } from './Constants';

/**
 * Prompts for the platform to use.
 * @param message - Custom message to use in prompt.
 * @param platforms - List of available platforms to select from.
 */
export async function promptForPlatform(message: string, platforms: string[]) {
  return (await prompt({
    name: 'platform',
    type: 'select',
    message,
    choices: platforms,
  })) as { platform: string };
}

/**
 * Prompt if existing model files should be overwritten.
 */
export async function promptOverwriteReverseBuild() {
  return (await prompt({
    name: 'overwrite',
    type: 'select',
    message: 'Found existing model files. How do you want to proceed?',
    choices: [
      { name: 'Overwrite', value: ANSWER_OVERWRITE },
      { name: 'Backup old files and proceed', value: ANSWER_BACKUP },
      { name: 'Cancel', value: ANSWER_CANCEL },
    ],
    result() {
      // Since enquirer returns the prompt's name by default, we need to get the value manually.
      // @ts-ignore
      return this.focused.value;
    },
  })) as { overwrite: string };
}

/**
 * Prompt for a project, depending on provided choices.
 * @param choices - Array of choices (projects) to choose from.
 */
export async function promptListForProjectId(choices: { name: string; value: string }[]) {
  return (await prompt({
    name: 'projectId',
    type: 'select',
    message: 'Select your project:',
    choices,
    result() {
      // Since enquirer returns the prompt's name by default, we need to get the value manually.
      // @ts-ignore
      return this.focused.value;
    },
  })) as { projectId: string };
}

/**
 * Prompt for overwrite.
 * @param message - Message to display on prompt.
 */
export async function promptOverwrite(message: string) {
  return (await prompt({
    name: 'overwrite',
    type: 'select',
    message,
    choices: [
      {
        value: ANSWER_OVERWRITE,
        name: 'Overwrite',
      },
      {
        value: ANSWER_CANCEL,
        name: 'Cancel',
      },
    ],
    result() {
      // Since enquirer returns the prompt's name by default, we need to get the value manually.
      // @ts-ignore
      return this.focused.value;
    },
  })) as { overwrite: string };
}
