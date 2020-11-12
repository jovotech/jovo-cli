import * as io from 'socket.io-client';
import { post, PostOptions } from './HttpPost';

let socketInstance: SocketIOClient.Socket;

/**
 * Connection options for open method
 *
 * @export
 * @interface ConnectionOptions
 */
export interface ConnectionOptions {
  post?: PostOptions;
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
export function open(
  id: string,
  webhookBaseUrl: string,
  options: ConnectionOptions,
): SocketIOClient.Socket {
  options = options || {};

  socketInstance = io.connect(webhookBaseUrl, {
    secure: true,
    query: {
      id,
    },
  });

  socketInstance.on('connect', () => {
    console.log(`This is your webhook url: ${webhookBaseUrl}/${id}`);
  });

  socketInstance.on('connect_error', (error: NodeJS.ErrnoException) => {
    console.error('Sorry, there seems to be an issue with the connection!');
    console.error(error);
  });

  // @ts-ignore
  socketInstance.on(`request-${id}`, (data) => {
    post(data.request, data.headers, data.params, options.post)
      .then((result) => {
        socketInstance.emit(`response-${id}`, result);
      })
      .catch((error) => {
        console.error('Local server did not return a valid JSON response:');
        console.error(error.rawData);
        socketInstance.emit(`response-${id}`, null);
      });
  });

  return socketInstance;
}

/**
 * Closes the socket connection
 *
 * @export
 * @returns {SocketIOClient.Socket}
 */
export function close(): SocketIOClient.Socket {
  return socketInstance.close();
}
