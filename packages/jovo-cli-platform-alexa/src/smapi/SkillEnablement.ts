import { JovoCliError } from 'jovo-cli-core';

import { JovoTaskContextAlexa, execAsync, getAskErrorV2 } from '../utils';

export async function enableSkill(ctx: JovoTaskContextAlexa, stage: string): Promise<void> {
  try {
    await execAsync(
      `ask smapi set-skill-enablement -s ${ctx.skillId} -g ${stage} ${
        ctx.askProfile ? `-p ${ctx.askProfile}` : ''
      }`,
    );
  } catch (err) {
    throw getAskErrorV2('smapiEnableSkill', err.message);
  }
}
