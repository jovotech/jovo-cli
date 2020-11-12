import { ClientRequest, IncomingMessage, request, RequestOptions } from 'http';
import _merge from 'lodash.merge';
import { ParsedUrlQueryInput, stringify } from 'querystring';

/**
 * Options for post request.
 */
export interface PostOptions {
  hostname?: string;
  port?: string;
  timeout?: number;
}

/**
 * Send post requests to local webhook.
 * @param data - Data to send.
 * @param headers - Headers to send.
 * @param queryParams - Query parameters to send.
 * @param options - Options for request.
 */
export function post(
  data: object,
  headers: any,
  queryParams: ParsedUrlQueryInput,
  options: PostOptions = {},
): Promise<object> {
  return new Promise((resolve, reject) => {
    const defaultHeaders = {
      'Content-Type': 'application/json',
    };

    const hostname: string = options.hostname || 'localhost';
    const port: string = options.port || '3000';
    const timeout: number = options.timeout || 5000;
    const webhookPath: string = headers.webhook_path || '';

    headers = _merge(defaultHeaders, headers);
    delete headers.host;
    delete headers['content-length'];

    const queryParamsString: string = stringify(queryParams);

    const config: RequestOptions = {
      hostname,
      port,
      path: `/webhook${webhookPath}?${queryParamsString}`,
      method: 'POST',
      headers,
    };

    const postData: string = JSON.stringify(data);

    const req: ClientRequest = request(config, (response: IncomingMessage) => {
      response.setEncoding('utf8');

      let rawData: string = '';

      response.on('data', (chunk: string) => {
        rawData += chunk;
      });

      response.on('end', () => {
        try {
          resolve(JSON.parse(rawData));
        } catch (error) {
          error.rawData = rawData;
          reject(error);
        }
      });
    })
      .on('error', (error: NodeJS.ErrnoException) => {
        if (error.code === 'ECONNRESET') {
          error.message = `Timeout error: No response after ${timeout} milliseconds`;
        } else if (error.code === 'ECONNREFUSED') {
          error.message = `There is no Jovo instance running on ${config.hostname}`;
        }
        reject(error);
      })
      .on('socket', (socket) => {
        socket.setTimeout(timeout);
        socket.on('timeout', () => {
          req.abort();
        });
      });

    req.write(postData);
    req.end();
  });
}
