import {
  SMAPI_ENDPOINT,
  STATUS,
  refreshToken,
  RequestOptions,
  request,
  JovoTaskContextAlexa,
} from '../utils';

export async function enableSkill(
  ctx: JovoTaskContextAlexa,
  stage: string = 'development',
): Promise<void> {
  try {
    const options: RequestOptions = {
      headers: {
        Authorization: ctx.accessToken,
      },
      hostname: SMAPI_ENDPOINT,
      method: 'PUT',
      path: `/v1/skills/${ctx.skillId}/stages/${stage}/enablement`,
    };

    const response = await request(options);

    switch (response.statusCode) {
      case STATUS.NO_CONTENT: {
        return;
      }
      case STATUS.UNAUTHORIZED: {
        const token = await refreshToken();
        ctx.accessToken = token;
        return await enableSkill(ctx, stage);
      }
      default: {
        throw new Error(response.data.message);
      }
    }
  } catch (err) {
    throw new Error(
      `Something went wrong while enabling your skill. Please see the logs below:${err.message}`,
    );
  }
}
