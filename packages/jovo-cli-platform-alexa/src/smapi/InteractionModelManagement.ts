import { writeFileSync, readFileSync } from 'fs-extra';

import { JovoTaskContextAlexa, execAsync, getAskErrorV2 } from '../utils';

export async function updateInteractionModel(
  ctx: JovoTaskContextAlexa,
  locale: string,
  interactionModelPath: string,
  stage: string,
): Promise<void> {
  try {
    let cmd = `ask smapi set-interaction-model -s ${ctx.skillId} -g ${stage} -l ${locale} -p ${ctx.askProfile} `;

    if (process.platform === 'win32') {
      const interactionModelJson = JSON.parse(readFileSync(interactionModelPath).toString());
      // Since windows does not support cat as Unix-systems do, we have
      // to include the json file directly in the command.
      // To make this work, json properties' double quotes need to be escaped.
      // To achieve this, we call JSON.stringify() twice.
      const interactionModelFlag = JSON.stringify(JSON.stringify(interactionModelJson));
      cmd += `--interaction-model '${interactionModelFlag}`;
    } else {
      cmd += `--interaction-model "$(cat ${interactionModelPath})"`;
    }
    await execAsync(cmd);
  } catch (err) {
    throw getAskErrorV2('smapiUpdateInteractionModel', err.message);
  }
}

export async function getInteractionModel(
  ctx: JovoTaskContextAlexa,
  locale: string,
  modelPath: string,
  stage: string,
) {
  try {
    const stdout = await execAsync(
      `ask smapi get-interaction-model -s ${ctx.skillId} -g ${stage} -l ${locale} -p ${ctx.askProfile}`,
    );
    const response = JSON.parse(stdout);
    writeFileSync(modelPath, JSON.stringify(response, null, '\t'));
  } catch (err) {
    throw getAskErrorV2('smapiGetInteractionModel', err.message);
  }
}
