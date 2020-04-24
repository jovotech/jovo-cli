import { RequestOptions, JovoTaskContextAlexa, request, STATUS } from '../utils';

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

    switch (response.statusCode) {
      case STATUS.OK: {
        return response.data;
      }
      case STATUS.NOT_FOUND: {
        return;
      }
      default: {
        throw new Error(response.data.message);
      }
    }
  } catch (err) {
    throw new Error(
      `Something went wrong while fetching information about account linking. Please see the logs below: ${err.message}`,
    );
  }
}
