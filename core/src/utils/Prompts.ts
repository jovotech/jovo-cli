import prompt from 'prompts';
import { ANSWER_BACKUP, ANSWER_CANCEL, ANSWER_OVERWRITE } from './Constants';
import { printUserInput } from './Prints';

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
 * Prompt for a project, depending on provided choices.
 * @param choices - Array of choices (projects) to choose from.
 */
export async function promptListForProjectId(
  choices: { title: string; value: string }[],
): Promise<{ projectId: string }> {
  return await prompt(
    {
      name: 'projectId',
      type: 'select',
      message: 'Select your project:',
      choices,
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
      onCancel(prompt, answers) {
        answers.overwrite = ANSWER_CANCEL;
      },
    },
  );
}
