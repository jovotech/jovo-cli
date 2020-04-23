import {
  SMAPI_ENDPOINT,
  STATUS,
  refreshToken,
  RequestOptions,
  request,
  JovoTaskContextAlexa,
} from '../utils';

export async function updateInteractionModel(
  ctx: JovoTaskContextAlexa,
  stage: string,
  locale: string,
  interactionModelPath: string,
): Promise<void> {
  try {
    const options: RequestOptions = {
      headers: {
        Authorization: ctx.accessToken,
      },
      hostname: SMAPI_ENDPOINT,
      method: 'PUT',
      path: `/v1/skills/${ctx.skillId}/stages/${stage}/interactionModel/locales/${locale}`,
    };

    const response = await request(ctx, options, require(interactionModelPath));

    if (response.statusCode !== STATUS.ACCEPTED) {
      throw new Error(response.data.message);
    }
  } catch (err) {
    throw new Error(
      `Something went wrong while updating your language model for locale ${locale}. Please see the logs below:${err.message}`,
    );
  }
}
