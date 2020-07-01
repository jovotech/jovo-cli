import { Utils } from 'jovo-cli-core';
import { writeFileSync } from 'fs-extra';

import { JovoTaskContextAlexa, AskSkillList, getAskErrorV2, execAsync } from '../utils';
import { prepareSkillList } from '../Ask';

export async function getSkillStatus(ctx: JovoTaskContextAlexa) {
  try {
    const cmd =
      'ask smapi get-skill-status ' +
      `-s ${ctx.skillId} ` +
      `${ctx.askProfile ? `-p ${ctx.askProfile}` : ''}`;

    const stdout = await execAsync(cmd);
    const response = JSON.parse(stdout);

    if (response.manifest) {
      const status = response.manifest.lastUpdateRequest.status;

      if (status === 'IN_PROGRESS') {
        await Utils.wait(500);
        await getSkillStatus(ctx);
      }
    }

    if (response.interactionModel) {
      const values: any[] = Object.values(response.interactionModel);
      for (const model of values) {
        const status = model.lastUpdateRequest.status;
        if (status === 'SUCCEEDED') {
          continue;
        } else if (status === 'IN_PROGRESS') {
          await Utils.wait(500);
          await getSkillStatus(ctx);
        }
      }
    }
  } catch (err) {
    throw getAskErrorV2('smapiGetSkillStatus', err.message);
  }
}

export async function createSkill(ctx: JovoTaskContextAlexa, skillJsonPath: string) {
  try {
    const cmd =
      'ask smapi create-skill-for-vendor ' +
      `${ctx.askProfile ? `-p ${ctx.askProfile}` : ''} ` +
      `--manifest "file:${skillJsonPath}"`;

    const stdout = await execAsync(cmd);
    const response = JSON.parse(stdout);

    return response.skillId;
  } catch (err) {
    throw getAskErrorV2('smapiCreateSkill', err.message);
  }
}

export async function updateSkill(ctx: JovoTaskContextAlexa, skillJsonPath: string) {
  try {
    const cmd =
      'ask smapi update-skill-manifest ' +
      `-s ${ctx.skillId} ` +
      `-g development ` +
      `${ctx.askProfile ? `-p ${ctx.askProfile}` : ''} ` +
      `--manifest "file:${skillJsonPath}"`;

    await execAsync(cmd);
  } catch (err) {
    throw getAskErrorV2('smapiUpdateSkill', err.message);
  }
}

export async function getSkillInformation(
  ctx: JovoTaskContextAlexa,
  skillJsonPath: string,
  stage: string,
) {
  try {
    const cmd =
      'ask smapi get-skill-manifest ' +
      `-s ${ctx.skillId} ` +
      `-g ${stage} ` +
      `${ctx.askProfile ? `-p ${ctx.askProfile}` : ''}`;

    const stdout = await execAsync(cmd);
    const response = JSON.parse(stdout);

    writeFileSync(skillJsonPath, JSON.stringify(response, null, '\t'));
  } catch (err) {
    throw getAskErrorV2('smapiGetSkillInformation', err.message);
  }
}

export async function listSkills(ctx: JovoTaskContextAlexa) {
  try {
    const cmd =
      'ask smapi list-skills-for-vendor ' + 
      `${ctx.askProfile ? `-p ${ctx.askProfile}` : ''}`;

    const stdout = await execAsync(cmd);
    const response = JSON.parse(stdout);

    return Promise.resolve(prepareSkillList(response as AskSkillList));
  } catch (err) {
    throw getAskErrorV2('smapiListSkills', err.message);
  }
}
