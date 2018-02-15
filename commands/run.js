#!/usr/bin/env node
'use strict';
const BSTProxy = require('bespoken-tools').BSTProxy;
const fs = require('fs');
const path = require('path');
const spawn = require('cross-spawn');
const http = require('http');
const io = require('socket.io-client');
const Helper = require('./../helper/lmHelper');
const _ = require('lodash');

/**
 * Returns path to home directory
 * @return {string}
 */
function getUserHome() {
    return process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME'];
}

if (process.argv.indexOf('run') > 0 && (process.argv.length === 3 || process.argv[3].indexOf('.js') === -1)) {
    process.argv.splice(3, 0, 'index.js');
}

module.exports = function(vorpal) {
    vorpal
        .command('run <webhookFile>', 'run')
        .description('Runs a local development server (webhook).')
        .option('-b, --bst-proxy', 'Proxies the HTTP service running at the specified port via bst')
        .option('-n, --ngrok', 'Http tunnel via ngrok. Ngrok instance has to run.')
        .option('-p, --port <port>', 'Port to local development webhook')
        .option('-w, --watch', 'Uses nodemon to watch files. Restarts immediately on file change.')
        .action((args) => {
            const port = args.options.port || 3000;

            const localServerFile = args.webhookFile ? args.webhookFile : 'index.js';

            let command = 'node';
            if (args.options.watch) {
                command = process.mainModule.paths[0] + path.sep + 'nodemon' + path.sep + 'bin' + path.sep + 'nodemon.js';
            }

            let parameters = ['./'+localServerFile, '--ignore db/*'];

            parameters.push('--webhook');


            if (args.options['bst-proxy']) {
                const proxy = BSTProxy.http(port);

                proxy.start(() => {
                    const data = fs.readFileSync(path.join(getUserHome(), '.bst/config'));
                    const bstConfig = JSON.parse(data.toString());
                    const proxyURL = 'https://' + bstConfig.sourceID + '.bespoken.link/webhook';
                    const dashboardURL = 'https://bespoken.tools/dashboard?id=' + bstConfig.sourceID + '&key=' + bstConfig.secretKey;
                    let messageOutput = 'Your public URL for accessing your local service:\n';
                    messageOutput += proxyURL + '\n\n';
                    messageOutput += 'Your URL for viewing requests/responses sent to your service:\n';
                    messageOutput += dashboardURL + '\n\n';
                    messageOutput += 'Copy and paste this to your browser to view your transaction history and summary data.\n';
                    console.log(messageOutput);
                });
                parameters.push('--bst-proxy');
            } else if (args.options.ngrok) {
            } else {
                let user = Helper.Project.getWebhookUuid();

               try {
                   const config = Helper.Project.getConfig();

                   if (!config.endpoint) {
                       throw new Error('a');
                   }

                   if (_.startsWith(config.endpoint, 'arn')) {
                       throw new Error('b');
                   }
               } catch (err) {
                   console.log(err);
                   console.log('Warning: Your endpoint in app.json is not a jovo-webhook url.');
               }

                const socket = io.connect(Helper.JOVO_WEBHOOK_URL, {
                    secure: true,
                    query: {
                        user: user,
                    },
                });
                socket.on('connect', function() {
                    console.log('This is your webhook url: ' + Helper.JOVO_WEBHOOK_URL + '/' + user);
                });
                socket.on('request-'+user, (data) => {
                    post(data.request, port).then((result) => {
                        socket.emit('response-' + user, result);
                    });
                });
                parameters.push('--jovo-webhook');
            }

            const ls = spawn(command, parameters, {windowsVerbatimArguments: true, stdio: 'inherit', cwd: process.cwd()});
            ls.on('data', (data) => {
                console.log(`stdout: ${data}`);
            });

            ls.on('data', (data) => {
                console.log(`stderr: ${data}`);
            });

            ls.on('close', (code) => {
                console.log(`${code}`);
            });
        });
};


/**
 * Send post requests to local webhook
 * @param {*} requestObj
 * @param {Number} port
 * @return {Promise<any>}
 */
function post(requestObj, port) {
    return new Promise((resolve, reject) => {
        let opt = {
            hostname: 'localhost',
            port: port,
            path: '/webhook',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        };
        let postData = JSON.stringify(requestObj);

        let req = http.request(opt, (res) => {
            res.setEncoding('utf8');
            let rawData = '';
            res.on('data', (chunk) => {
                rawData += chunk;
            });
            res.on('end', () => {
                let parsedData;
                try {
                    parsedData = JSON.parse(rawData);
                } catch (e) {
                    reject(new Error('Something went wrong'));
                    return;
                }

                resolve(parsedData);
            });
        }).on('error', (e) => {
            if (e.code === 'ECONNRESET') {
                console.log('Timeout error: No response after ' + 5000 + ' milliseconds');
            }
            reject(e);
        }).on('socket', function(socket) {
            socket.setTimeout(5000);
            socket.on('timeout', function() {
                req.abort();
            });
        });
        req.write(postData);
        req.end();
    });
}
