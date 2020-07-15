import { execAsync, JovoTaskContextAlexa, getAskErrorV2 } from '../utils';

export async function enableSkill(ctx: JovoTaskContextAlexa, stage: string) {
  try {
    const cmd =
      'ask smapi set-skill-enablement ' +
      `-s ${ctx.skillId} ` +
      `-g ${stage} ` +
      `${ctx.askProfile ? `-p ${ctx.askProfile}` : ''}`;

    await execAsync(cmd);
  } catch (err) {
    throw getAskErrorV2('smapiEnableSkill', err.message);
  }
}
