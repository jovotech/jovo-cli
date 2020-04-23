import { RequestOptions, JovoTaskContextAlexa, SMAPI_ENDPOINT, request, STATUS } from '../utils';

export async function getAccountLinkingInformation(
  ctx: JovoTaskContextAlexa,
  stage: string = 'development',
) {
  try {
    const options: RequestOptions = {
      method: 'GET',
      path: `/v1/skills/${ctx.skillId}/stages/${stage}/accountLinkingClient`,
    };

    const response = await request(ctx, options);

    if (response.statusCode === STATUS.OK) {
      return response.data;
    } else {
      throw new Error(response.data.message);
    }
  } catch (err) {
    throw new Error(
      `Something went wrong while fetching information about account linking. Please see the logs below: ${err.message}`,
    );
  }
}
