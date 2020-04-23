import * as https from 'https';
import * as path from 'path';
import * as os from 'os';
import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';

import { RequestOptions, RequestBody, SMAPIResponse, JovoTaskContextAlexa } from './Interfaces';
import { STATUS, SMAPI_ENDPOINT, CLIENT_ID, CLIENT_SECRET } from './Constants';

export * from './Interfaces';
export * from './Constants';

export function request(
  ctx: JovoTaskContextAlexa,
  options: RequestOptions,
  body?: RequestBody,
): Promise<SMAPIResponse> {
  // Set constant request properties.
  if (!options.headers) {
    options.headers = {};
  }
  options.headers.Authorization = ctx.accessToken;
  options.hostname = options.hostname || SMAPI_ENDPOINT;

  return new Promise((res, rej) => {
    const req = https.request(options, async (response) => {
      if (response.statusCode === STATUS.UNAUTHORIZED) {
        const token = await refreshToken(ctx);
        ctx.accessToken = token;
        return await request(ctx, options, body);
      }

      let data = '';

      response.on('data', (d) => {
        data += d;
      });

      response.on('end', () => {
        res({
          headers: response.headers,
          statusCode: response.statusCode || 200,
          data: JSON.parse(data || '{}'),
        });
      });
    });

    if ((options.method === 'POST' || options.method === 'PUT') && body) {
      req.write(JSON.stringify(body));
    }

    req.on('error', (err) => {
      rej(err);
    });

    req.end();
  });
}

// ToDo: Exec ask-cli for authorization
export async function refreshToken(
  ctx: JovoTaskContextAlexa,
  profile: string = 'default',
): Promise<string> {
  try {
    const options = {
      hostname: 'api.amazon.com',
      path: '/auth/o2/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const bodyData = {
      grant_type: 'refresh_token',
      refresh_token: getRefreshToken(profile),
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    };

    const response = await request(ctx, options, bodyData);

    // Write new token into config file.
    if (response.statusCode === 200) {
      const askConfigPath = path.join(os.homedir(), '.ask', 'cli_config');
      const askConfig = getAskConfig();

      askConfig.profiles[profile].token.access_token = response.data.access_token;

      const dt = new Date();
      dt.setSeconds(dt.getSeconds() + response.data.expires_in);
      askConfig.profiles[profile].token.expires_at = dt;

      writeFileSync(askConfigPath, JSON.stringify(askConfig, null, '\t'));

      return response.data.access_token;
    } else {
      throw new Error(response.data.message || response.data.error_description);
    }
  } catch (err) {
    throw new Error(
      `Something went wrong while refreshing your access token. Please see the logs below:${err.message}`,
    );
  }
}

// ToDo: Exec ask-cli for authorization
// export function refreshToken(profile: string = 'default') {
//   try {
//     execSync('ask deploy');
//   } catch (err) {
//     // Do nothing, as this will only refresh the token
//   }
//   return getAccessToken(profile);
// }

export function getRefreshToken(profile: string = 'default'): string {
  const askConfig = getAskConfig();
  return askConfig.profiles[profile].token.refresh_token;
}

export function getAccessToken(profile: string = 'default'): string {
  const askConfig = getAskConfig();
  return askConfig.profiles[profile].token.access_token;
}

export function getVendorId(profile: string = 'default') {
  const askConfig = getAskConfig();
  return askConfig.profiles[profile].vendor_id;
}

export function getAskConfig() {
  const p = getAskConfigPath();
  const file = readFileSync(p, { encoding: 'utf-8' });
  return JSON.parse(file);
}

export function getAskConfigPath() {
  return path.join(os.homedir(), '.ask', 'cli_config');
}
