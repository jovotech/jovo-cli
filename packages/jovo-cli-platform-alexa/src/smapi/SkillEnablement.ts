import { STATUS, RequestOptions, request, JovoTaskContextAlexa } from '../utils';

export async function enableSkill(
  ctx: JovoTaskContextAlexa,
  stage: string = 'development',
): Promise<void> {
  try {
    const options: RequestOptions = {
      method: 'PUT',
      path: `/v1/skills/${ctx.skillId}/stages/${stage}/enablement`,
    };

    const response = await request(ctx, options);

    if (response.statusCode !== STATUS.NO_CONTENT) {
      throw new Error(response.data.message);
    }
  } catch (err) {
    throw new Error(
      `Something went wrong while enabling your skill. Please see the logs below:${err.message}`,
    );
  }
}
