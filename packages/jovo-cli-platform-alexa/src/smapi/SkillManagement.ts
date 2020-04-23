import { Utils } from 'jovo-cli-core';
import {
  request,
  RequestOptions,
  SMAPI_ENDPOINT,
  STATUS,
  refreshToken,
  JovoTaskContextAlexa,
} from '../utils';

export async function getSkillStatus(ctx: JovoTaskContextAlexa) {
  try {
    const options: RequestOptions = {
      headers: {
        Authorization: ctx.accessToken,
      },
      hostname: SMAPI_ENDPOINT,
      method: 'GET',
      path: `/v1/skills/${ctx.skillId}/status`,
    };
    const response = await request(ctx, options);

    if (response.data.manifest) {
      const status = response.data.manifest.lastUpdateRequest.status;

      if (status === 'IN_PROGRESS') {
        await Utils.wait(500);
        await getSkillStatus(ctx);
      }
    }

    if (response.data.interactionModel) {
      const values: any[] = Object.values(response.data.interactionModel);
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
    throw new Error(
      `Something ewnt wrong with your skill. Please see the logs below: ${err.message}`,
    );
  }
}

export async function createSkill(
  ctx: JovoTaskContextAlexa,
  skillJsonPath: string,
): Promise<string> {
  try {
    // ToDo: outsource!
    const bodyData = {
      vendorId: 'MABP11QQSDL7E',
      ...require(skillJsonPath),
    };
    const options: RequestOptions = {
      headers: {
        Authorization: ctx.accessToken,
      },
      hostname: SMAPI_ENDPOINT,
      method: 'POST',
      path: '/v1/skills',
    };

    const response = await request(ctx, options, bodyData);

    if (response.statusCode === STATUS.ACCEPTED) {
      return response.data.skillId as string;
    } else {
      throw new Error(response.data.message);
    }
  } catch (err) {
    throw new Error(
      `Something went wrong while creating your skill. Please see the logs below: ${err.message}`,
    );
  }
}

export async function updateSkill(ctx: JovoTaskContextAlexa, skillJsonPath: string): Promise<void> {
  try {
    const options: RequestOptions = {
      headers: {
        Authorization: ctx.accessToken,
      },
      hostname: SMAPI_ENDPOINT,
      method: 'PUT',
      // ToDo: different stages?
      path: `/v1/skills/${ctx.skillId}/stages/development/manifest`,
    };

    const response = await request(ctx, options, require(skillJsonPath));

    if (response.statusCode !== STATUS.ACCEPTED) {
      throw new Error(response.data.message);
    }
  } catch (err) {
    throw new Error(
      `Something went wrong while updating your skill. Please see the logs below:${err.message}`,
    );
  }
}
