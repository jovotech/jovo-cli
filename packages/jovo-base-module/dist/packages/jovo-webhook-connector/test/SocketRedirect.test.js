"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const http = require("http");
const url = require("url");
const ioBackend = require("socket.io");
const src_1 = require("../src");
const REQUEST_ID = '123456789';
let httpServerIo;
let httpServerIoAddr;
let httpServerBackend;
let httpServerBackendAddr;
let ioServer;
beforeAll((done) => {
    httpServerIo = http.createServer().listen();
    httpServerIoAddr = httpServerIo.listen().address();
    ioServer = ioBackend(httpServerIo);
    httpServerBackend = http.createServer((req, res) => {
        let body = '';
        req.on('data', (data) => {
            body += data;
        });
        req.on('end', () => {
            const data = {
                request: JSON.parse(body),
                headers: req.headers,
                params: url.parse(req.url, true).query,
            };
            ioServer.emit(`request-${REQUEST_ID}`, data);
        });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.write(JSON.stringify({ success: true }));
        res.end();
    }).listen();
    httpServerBackendAddr = httpServerBackend.listen().address();
    done();
});
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
                    }
                }
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
                                    data: 'asdf'
                                }
                            }
                        }
                    },
                    query: {
                        param1: 'a',
                        param2: 'b',
                    }
                }
            },
            {
                description: 'no query data',
                data: {
                    post: {
                        myNumber: 1,
                        myString: 'a',
                    }
                }
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
                    }
                }
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
                    }
                }
            },
        ];
        webhookTests.forEach((webhookTest) => {
            test(webhookTest.description, (done) => {
                const httpServerLocal = http.createServer((req, res) => {
                    if (webhookTest.data.query) {
                        const queryObject = url.parse(req.url, true).query;
                        expect(queryObject).toEqual(webhookTest.data.query);
                    }
                    let body = '';
                    req.on('data', (data) => {
                        body += data;
                    });
                    req.on('end', () => {
                        expect(JSON.parse(body)).toEqual(webhookTest.data.post);
                        done();
                        httpServerLocal.close();
                        src_1.close();
                    });
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.write(JSON.stringify({ success: true }));
                    res.end();
                }).listen();
                const httpServerLocalAddr = httpServerLocal.listen().address();
                const socketRedirectOptions = {
                    post: {
                        hostname: httpServerLocalAddr.address,
                        port: httpServerLocalAddr.port,
                    }
                };
                src_1.open(REQUEST_ID, `http://[${httpServerIoAddr.address}]:${httpServerIoAddr.port}`, socketRedirectOptions);
                setTimeout(() => {
                    let queryString = '';
                    let key;
                    for (key in webhookTest.data.query) {
                        if (webhookTest.data.query.hasOwnProperty(key)) {
                            queryString += `${encodeURIComponent(key)}=${encodeURIComponent(webhookTest.data.query[key])}&`;
                        }
                    }
                    const opt = {
                        hostname: httpServerBackendAddr.address,
                        port: httpServerBackendAddr.port,
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
//# sourceMappingURL=SocketRedirect.test.js.map