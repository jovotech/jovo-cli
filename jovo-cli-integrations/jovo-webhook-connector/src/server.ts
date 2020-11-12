import * as http from 'http';
import { AddressInfo } from 'net';
import ioBackend from 'socket.io';
import * as url from 'url';

const REQUEST_ID = '123456789';

// Create server with bidirectional communication.
const httpServerIo: http.Server = http.createServer().listen();
const ioServer: ioBackend.Server = ioBackend(httpServerIo);

const httpServerBackend: http.Server = http
  .createServer((request: http.IncomingMessage, response: http.ServerResponse) => {
    let body: string = '';

    request.on('data', (chunk: Buffer) => {
      body += chunk;
    });
    request.on('end', () => {
      const data = {
        request: JSON.parse(body),
        headers: request.headers,
        params: url.parse(request.url as string, true).query,
      };
      ioServer.emit(`request-${REQUEST_ID}`, data);
    });

    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.write(JSON.stringify({ success: true }));
    response.end();
  })
  .listen();

const httpServerBackendAddr: AddressInfo = httpServerBackend.address() as AddressInfo;
