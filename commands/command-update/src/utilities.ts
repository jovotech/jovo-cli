import {
  ANSWER_CANCEL,
  ANSWER_UPDATE,
  Package,
  printOutdatedPackages,
  printUserInput,
  prompt,
} from '@jovotech/cli-core';

export async function promptUpdate(outdatedPackages: Package[]): Promise<{ update: string }> {
  return await prompt(
    {
      name: 'update',
      type: 'select',
      message: [
        'Updates available for the following Jovo packages:',
        '',
        printOutdatedPackages(outdatedPackages),
        '',
        '  How do you want to proceed?',
      ].join('\n'),
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
