import * as http from 'http';
import { AddressInfo } from 'net';
import * as ioBackend from 'socket.io';
import * as url from 'url';

import { close as closeConnector, open as openConnector } from '../src';

const REQUEST_ID = '123456789';

let httpServerIo: http.Server;
let httpServerIoAddr: AddressInfo;
let httpServerBackend: http.Server;
let httpServerBackendAddr: AddressInfo;
let ioServer: ioBackend.Server;
httpServerIo = http.createServer().listen();
httpServerIoAddr = httpServerIo.address() as AddressInfo;
ioServer = ioBackend(httpServerIo);

httpServerBackend = http
  .createServer((req, res) => {
    let body = '';
    req.on('data', (data) => {
      body += data;
    });
    req.on('end', () => {
      const data = {
        request: JSON.parse(body),
        headers: req.headers,
        params: url.parse(req.url as string, true).query,
      };
      ioServer.emit(`request-${REQUEST_ID}`, data);
    });

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.write(JSON.stringify({ success: true }));
    res.end();
  })
  .listen();

httpServerBackendAddr = httpServerBackend.address() as AddressInfo;
