import { execAsync } from 'jovo-cli-core';

import { AskSkillList, getAskError } from '../utils';

export async function getSkillInformation(skillId: string, stage: string, askProfile: string) {
  const cmd: string = `ask smapi get-skill-manifest -s ${skillId} -g ${stage} ${
    askProfile ? `-p ${askProfile}` : ''
  }`;

  try {
    const stdout: string = await execAsync(cmd);
    return JSON.parse(stdout);
  } catch (error) {
    throw getAskError('smapiGetSkillInformation', error.message);
  }
}

export async function listSkills(askProfile: string): Promise<AskSkillList> {
  const cmd: string = `ask smapi list-skills-for-vendor ${askProfile ? `-p ${askProfile}` : ''}`;

  try {
    const stdout: string = await execAsync(cmd);
    return JSON.parse(stdout) as AskSkillList;
  } catch (error) {
    throw getAskError('smapiListSkills', error.message);
  }
}
