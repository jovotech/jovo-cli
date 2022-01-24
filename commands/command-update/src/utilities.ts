import { ANSWER_CANCEL, ANSWER_UPDATE, printUserInput, prompt } from '@jovotech/cli-core';

export async function promptUpdate(): Promise<{ update: string }> {
  return await prompt(
    {
      name: 'update',
      type: 'select',
      message: 'How do you want to proceed?',
      choices: [
        {
          title: printUserInput('Update all packages'),
          value: ANSWER_UPDATE,
        },
        {
          title: printUserInput('Cancel'),
          value: ANSWER_CANCEL,
        },
      ],
    },
    {
      onCancel(_prompt, answers) {
        answers.update = ANSWER_CANCEL;
      },
    },
  );
}
