import { execAsync } from 'jovo-cli-core';
import { getAskError } from '../utils';

export async function getAccountLinkingInformation(
  skillId: string,
  stage: string,
  askProfile?: string,
) {
  const cmd =
    'ask smapi get-account-linking-info ' +
    `-s ${skillId} ` +
    `-g ${stage} ` +
    `${askProfile ? `-p ${askProfile}` : ''}`;

  try {
    const stdout: string = await execAsync(cmd);
    const response = JSON.parse(stdout);
    console.log(response);
    return response.accountLinkingResponse;
  } catch (error) {
    // ToDo: Always 1?
    if (error.code === 1) {
      return;
    }
    throw getAskError('smapiGetAccountLinkingInformation', error.message);
  }
}
