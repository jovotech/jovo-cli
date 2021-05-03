import { ParsedUrlQueryInput, stringify } from 'querystring';
import { Socket, io } from 'socket.io-client';
import _merge from 'lodash.merge';
import { ClientRequest, IncomingHttpHeaders, IncomingMessage, request, RequestOptions } from 'http';

/**
 * Options for post request.
 */
export interface PostOptions {
  port?: string;
  timeout?: number;
}

/**
 * Opens the socket connection to redirect requests from Webhook
 * to localhost
 *
 * @export
 * @param {number} id The unique webhook id
 * @param {string} webhookBaseUrl The URL of the webhook
 * @param {ConnectionOptions} options Additional opions for connection
 * @returns {SocketIOClient.Socket}
 */
export function open(id: string, webhookBaseUrl: string, options: PostOptions): Socket {
  const socket: Socket = io(webhookBaseUrl, {
    secure: true,
    query: { id },
  });

  socket.on('connect', () => {
    console.log(`This is your webhook url: ${webhookBaseUrl}/${id}`);
  });

  socket.on('connect_error', (error: NodeJS.ErrnoException) => {
    console.error('Sorry, there seems to be an issue with the connection!');
    console.error(error);
    process.exit();
  });

  socket.on(
    `request-${id}`,
    (data: { request: object; headers: IncomingHttpHeaders; params: ParsedUrlQueryInput }) => {
      post(data.request, data.headers, data.params, options)
        .then((result) => {
          socket.emit(`response-${id}`, result);
        })
        .catch((error) => {
          console.error('Local server did not return a valid JSON response:');
          console.error(error.rawData);
          socket.emit(`response-${id}`, null);
        });
    },
  );

  process.on('exit', () => {
    socket.close();
  });

  return socket;
}

/**
 * Send post requests to local webhook.
 * @param data - Data to send.
 * @param headers - Headers to send.
 * @param queryParams - Query parameters to send.
 * @param options - Options for request.
 */
function post(
  data: object,
  headers: IncomingHttpHeaders,
  queryParams: ParsedUrlQueryInput,
  options: PostOptions,
): Promise<object> {
  return new Promise((resolve, reject) => {
    const defaultHeaders: IncomingHttpHeaders = {
      'Content-Type': 'application/json',
    };

    headers = _merge(defaultHeaders, headers);
    delete headers.host;
    delete headers['content-length'];

    const timeout: number = options.timeout || 5000;
    const webhookPath: string = (headers.webhook_path as string) || '';

    const queryString: string = stringify(queryParams);

    const config: RequestOptions = {
      headers,
      port: options.port || '3000',
      hostname: 'localhost',
      path: `/webhook${webhookPath}?${queryString}`,
      method: 'POST',
    };

    const postData: string = JSON.stringify(data);

    const req: ClientRequest = request(config, (response: IncomingMessage) => {
      response.setEncoding('utf8');

      let rawData = '';

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
          req.destroy();
        });
      });

    req.write(postData);
    req.end();
  });
}
