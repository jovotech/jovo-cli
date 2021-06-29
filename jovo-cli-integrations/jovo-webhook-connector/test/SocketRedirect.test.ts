import * as http from 'http';
import * as ioBackend from 'socket.io';
import * as url from 'url';

import { close as closeConnector, open as openConnector } from '../src';

const WEBSERVER_PORT = 4100;
const SOCKET_IO_PORT = 4000;
const REQUEST_ID = '123456789';

let httpServerIo: http.Server;
let httpServerBackend: http.Server;
let ioServer: ioBackend.Server;

/**
 * Mock the backend which forwards http data to socket
 */
beforeAll((done) => {
  httpServerIo = http.createServer().listen(SOCKET_IO_PORT);

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
    .listen(WEBSERVER_PORT);
  done();
});

/**
 *  Cleanup Servers
 */
afterAll((done) => {
  httpServerBackend.close();
  ioServer.close();
  done();
});

describe('webhook tests', () => {
  describe('send/receive', () => {
    const webhookTests = [
      {
        description: 'basic data',
        data: {
          post: {
            myNumber: 1,
            myString: 'a',
          },
          query: {
            param1: 'a',
            param2: 'b',
          },
        },
      },
      {
        description: 'deep level post json',
        data: {
          post: {
            myNumber: 1,
            myString: 'a',
            deepObject1: {
              deepObject2: {
                deepObject3: {
                  data: 'asdf',
                },
              },
            },
          },
          query: {
            param1: 'a',
            param2: 'b',
          },
        },
      },
      {
        description: 'no query data',
        data: {
          post: {
            myNumber: 1,
            myString: 'a',
          },
        },
      },
      {
        description: 'special characters in post data',
        data: {
          post: {
            myNumber: 1,
            myString: 'asdfäüöß=?@#"\'$%*&()_{}[]',
          },
          query: {
            param1: 'a',
            param2: 'b',
          },
        },
      },
      {
        description: 'special characters in query data',
        data: {
          post: {
            myNumber: 1,
            myString: 'a',
          },
          query: {
            param1: 'key-asdfäüöß=?@#"\'$%*&()_{}[]',
            param2: 'value-asdfäüöß=?@#"\'$%*&()_{}[]',
          },
        },
      },
    ];

    let port = 8000;
    webhookTests.forEach((webhookTest) => {
      test(webhookTest.description, (done) => {
        // Create the local http server which will receive the data
        const httpServerLocal = http
          .createServer((req, res) => {
            // Check the query parameters
            if (webhookTest.data.query) {
              const queryObject = url.parse(req.url as string, true).query;
              expect(queryObject).toEqual(webhookTest.data.query);
            }

            // Check the body/post data
            let body = '';
            req.on('data', (data) => {
              body += data;
            });
            req.on('end', () => {
              expect(JSON.parse(body)).toEqual(webhookTest.data.post);
              done();
              httpServerLocal.close();
              closeConnector();
            });

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.write(JSON.stringify({ success: true }));
            res.end();
          })
          .listen(++port);

        // Configure to send received socket data to above created http server
        const socketRedirectOptions = {
          post: {
            // @ts-ignore
            hostname: 'localhost',
            port: port.toString(),
          },
        };

        // Create the socket connection which will forward the data
        openConnector(REQUEST_ID, `http://localhost:${SOCKET_IO_PORT}`, socketRedirectOptions);

        // Make request to trigger socket message to be send to local http server
        setTimeout(() => {
          let queryString = '';
          let key;
          // @ts-ignore
          for (key in webhookTest.data.query) {
            // @ts-ignore
            if (webhookTest.data.query.hasOwnProperty(key)) {
              queryString += `${encodeURIComponent(key)}=${encodeURIComponent(
                // @ts-ignore
                webhookTest.data.query[key],
              )}&`;
            }
          }

          const opt = {
            hostname: 'localhost',
            port: WEBSERVER_PORT,
            path: `/webhook?${queryString}`,
            method: 'POST',
            headers: {
              'content-type': 'application/json',
            },
          };

          const req = http.request(opt);
          req.write(JSON.stringify(webhookTest.data.post));
          req.end();
        }, 50);
      });
    });
  });
});
