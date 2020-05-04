import { Utils, JovoCliError } from 'jovo-cli-core';
import { writeFileSync, readFileSync } from 'fs-extra';
import { ChoiceType } from 'inquirer';

import { JovoTaskContextAlexa, AskSkillList, execAsync, getAskErrorV2 } from '../utils';
import { prepareSkillList } from '../Ask';

export async function getSkillStatus(ctx: JovoTaskContextAlexa) {
  try {
    const stdout = await execAsync(
      `ask smapi get-skill-status -s ${ctx.skillId} -p ${ctx.askProfile}`,
    );

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

export async function createSkill(
  ctx: JovoTaskContextAlexa,
  skillJsonPath: string,
): Promise<string> {
  try {
    let cmd = `ask smapi create-skill-for-vendor -p ${ctx.askProfile} `;

    if (process.platform === 'win32') {
      const manifestJson = JSON.parse(readFileSync(skillJsonPath).toString());
      // Since windows does not support cat as Unix-systems do, we have
      // to include the json file directly in the command.
      // To make this work, json properties' double quotes need to be escaped.
      // To achieve this, we call JSON.stringify() twice.
      const manifestFlag = JSON.stringify(JSON.stringify(manifestJson));
      cmd += `--manifest ${manifestFlag}`;
    } else {
      cmd += `--manifest "$(cat ${skillJsonPath})"`;
    }

    const stdout = await execAsync(cmd);

    const { skillId } = JSON.parse(stdout);
    return skillId;
  } catch (err) {
    throw getAskErrorV2('smapiCreateSkill', err.message);
  }
}

export async function updateSkill(ctx: JovoTaskContextAlexa, skillJsonPath: string): Promise<void> {
  try {
    let cmd = `ask smapi update-skill-manifest -s ${ctx.skillId} -g development -p ${ctx.askProfile} `;

    if (process.platform === 'win32') {
      const manifestJson = JSON.parse(readFileSync(skillJsonPath).toString());
      // Since windows does not support cat as Unix-systems do, we have
      // to include the json file directly in the command.
      // To make this work, json properties' double quotes need to be escaped.
      // To achieve this, we call JSON.stringify() twice.
      const manifestFlag = JSON.stringify(JSON.stringify(manifestJson));
      cmd += `--manifest ${manifestFlag}`;
    } else {
      cmd += `--manifest "$(cat ${skillJsonPath})"`;
    }

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
    const stdout = await execAsync(
      `ask smapi get-skill-manifest -s ${ctx.skillId} -g ${stage} -p ${ctx.askProfile}`,
    );

    const response = JSON.parse(stdout);

    writeFileSync(skillJsonPath, JSON.stringify(response, null, '\t'));
  } catch (err) {
    throw getAskErrorV2('smapiGetSkillInformation', err.message);
  }
}

export async function listSkills(ctx: JovoTaskContextAlexa): Promise<ChoiceType[]> {
  try {
    const stdout = await execAsync(`ask smapi list-skills-for-vendor -p ${ctx.askProfile}`);

    const response = JSON.parse(stdout);

    return Promise.resolve(prepareSkillList(response as AskSkillList));
  } catch (err) {
    throw getAskErrorV2('smapiListSkills', err.message);
  }
}
