import { pathExistsSync, readFileSync } from 'fs-extra';
import { JovoCliError } from 'jovo-cli-core';

import { JovoTaskContextAlexa, execAsync, getAskErrorV2 } from '../utils';

export async function getAccountLinkingInformation(ctx: JovoTaskContextAlexa, stage: string) {
  try {
    const stdout = await execAsync(
      `ask smapi get-account-linking-info -s ${ctx.skillId} -g ${stage} -p ${ctx.askProfile}`,
    );
    const response = JSON.parse(stdout);
    return response.accountLinkingResponse;
  } catch (err) {
    if (err.code === 1) {
      return;
    }

    throw getAskErrorV2('smapiGetAccountLinkingInformation', err.message);
  }
}

export async function updateAccountLinkingInformation(
  ctx: JovoTaskContextAlexa,
  accountLinkingJsonPath: string,
  stage: string,
) {
  try {
    if (!pathExistsSync(accountLinkingJsonPath)) {
      return;
    }

    let cmd = `ask smapi update-account-linking-info -s ${ctx.skillId} -g ${stage} -p ${ctx.askProfile} `;

    if (process.platform === 'win32') {
      const accountLinkingJson = JSON.parse(readFileSync(accountLinkingJsonPath).toString());
      // Since windows does not support cat as Unix-systems do, we have
      // to include the json file directly in the command.
      // To make this work, json properties' double quotes need to be escaped.
      // To achieve this, we call JSON.stringify() twice.
      const accountLinkingFlag = JSON.stringify(JSON.stringify(accountLinkingJson));
      cmd += `--account-linking-request ${accountLinkingFlag}`;
    } else {
      cmd += `--account-linking-request "$(cat ${accountLinkingJsonPath})"`;
    }

    await execAsync(cmd);
  } catch (err) {
    throw getAskErrorV2('smapiUpdateAccountLinkingInformation', err.message);
  }
}
