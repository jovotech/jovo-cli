import { execAsync } from 'jovo-cli-core';
import { getAskError } from '../utils';

export async function getInteractionModel(
  skillId: string,
  locale: string,
  stage: string,
  askProfile?: string,
) {
  try {
    const cmd =
      'ask smapi get-interaction-model ' +
      `-s ${skillId} ` +
      `-g ${stage} ` +
      `-l ${locale} ` +
      `${askProfile ? `-p ${askProfile}` : ''}`;

    const stdout = await execAsync(cmd);
    return JSON.parse(stdout);
  } catch (error) {
    throw getAskError('smapiGetInteractionModel', error.message);
  }
}
