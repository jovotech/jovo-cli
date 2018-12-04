"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const http = require("http");
const querystring = require("querystring");
const lodash_1 = require("lodash");
const es6_promise_1 = require("es6-promise");
function post(data, headers, queryParams, options) {
    return new es6_promise_1.Promise((resolve, reject) => {
        const defaultHeaders = {
            'content-type': 'application/json',
        };
        options = options || {};
        const hostname = options.hostname || 'localhost';
        const port = options.port || '3000';
        const timeout = options.timeout || 5000;
        headers = lodash_1.merge(defaultHeaders, headers);
        delete headers['host'];
        delete headers['content-length'];
        const queryParamsString = querystring.stringify(queryParams);
        const opt = {
            hostname,
            port,
            path: '/webhook?' + queryParamsString,
            method: 'POST',
            headers,
        };
        const postData = JSON.stringify(data);
        const req = http.request(opt, (res) => {
            res.setEncoding('utf8');
            let rawData = '';
            res.on('data', (chunk) => {
                rawData += chunk;
            });
            res.on('end', () => {
                try {
                    resolve(JSON.parse(rawData));
                }
                catch (e) {
                    e.rawData = rawData;
                    reject(e);
                }
            });
        })
            .on('error', (e) => {
            if (e.code === 'ECONNRESET') {
                e.message = 'Timeout error: No response after ' + timeout + ' milliseconds';
            }
            else if (e.code === 'ECONNREFUSED') {
                e.message = 'There is no Jovo instance running on ' + opt.hostname;
            }
            reject(e);
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
exports.post = post;
//# sourceMappingURL=HttpPost.js.map