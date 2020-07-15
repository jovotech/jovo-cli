import { writeFileSync } from 'fs-extra';

import { execAsync, JovoTaskContextAlexa, getAskErrorV2 } from '../utils';

export async function updateInteractionModel(
  ctx: JovoTaskContextAlexa,
  locale: string,
  interactionModelPath: string,
  stage: string,
) {
  try {
    const cmd =
      'ask smapi set-interaction-model ' +
      `-s ${ctx.skillId} ` +
      `-g ${stage} ` +
      `-l ${locale} ` +
      `${ctx.askProfile ? `-p ${ctx.askProfile}` : ''} ` +
      `--interaction-model "file:${interactionModelPath}"`;

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
    const cmd =
      'ask smapi get-interaction-model ' +
      `-s ${ctx.skillId} ` +
      `-g ${stage} ` +
      `-l ${locale} ` +
      `${ctx.askProfile ? `-p ${ctx.askProfile}` : ''}`;

    const stdout = await execAsync(cmd);
    const response = JSON.parse(stdout);

    writeFileSync(modelPath, JSON.stringify(response, null, '\t'));
  } catch (err) {
    throw getAskErrorV2('smapiGetInteractionModel', err.message);
  }
}
