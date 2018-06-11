#!/usr/bin/env node
'use strict';
const BSTProxy = require('bespoken-tools').BSTProxy;
const fs = require('fs');
const path = require('path');
const spawn = require('cross-spawn');
const resolveBin = require('resolve-bin');
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
        .option('-i, --inspect [inspectPort]', 'Debugging port')
        .option('--stage <stage>', 'Takes configuration from <stage>')
        .option('-w, --watch', 'Uses nodemon to watch files. Restarts immediately on file change.')
        .option('--webhook-only', 'Starts the Jovo Webhook proxy without executing the code')
        .option('-r, --record <name>', 'Can be used to record requests and responses of your Jovo app for testing purposes.')
        .action((args, callback) => {
            const port = args.options.port || 3000;

            try {
                Helper.Project.getConfig(args.options.stage);
            } catch (e) {
                console.log('\n\n Could not load app.json. \n\n');
                callback();
                return;
            }

            if (args.options['webhook-only']) {
                jovoWebhook(port, args.options.stage);
                return;
            }
            let srcDir = '';
            // prepend src directory from config
            if (Helper.Project.getConfigParameter('src', args.options.stage)) {
                srcDir = Helper.Project.getConfigParameter('src', args.options.stage);
                if (srcDir && !_.endsWith(path.sep, srcDir )) {
                    srcDir = srcDir + path.sep;
                }
            }

            const localServerFile = args.webhookFile === 'index.js' ? 'index.js' : args.webhookFile;
            let command = 'node';
            if (args.options.watch) {
                command = resolveBin.sync('nodemon');
            }

            let parameters = ['./'+localServerFile, '--ignore', 'db/*'];

            if (args.options.record) {
                parameters.push('--record');
                parameters.push(args.options.record);
            }

            if (args.options.inspect) {
                let inspectPort = 9229;
                if (_.isNumber(args.options.inspect)) {
                    inspectPort = parseInt(args.options.inspect);
                }
                parameters.unshift('--inspect=' + inspectPort);
            }

            parameters.push('--webhook');

            // add project path to parameters if source path is not project path
            if (srcDir.length > 0) {
                parameters.push('--projectDir');
                parameters.push(process.cwd());
            }

            if (args.options.stage) {
                parameters.push('--stage');
                parameters.push(args.options.stage);
            }

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
                jovoWebhook(port, args.options.stage);
                parameters.push('--jovo-webhook');
            }
            const ls = spawn(command, parameters, {windowsVerbatimArguments: true, stdio: 'inherit', cwd: srcDir || process.cwd()});
            ls.on('data', (data) => {
                console.log(`stdout: ${data}`);
            });

            ls.on('data', (data) => {
                console.log(`stderr: ${data}`);
            });

            ls.on('close', (code) => {
                // console.log(`${code}`);
            });
        });
};


/**
 * Initializes connection to the Jovo Webhook
 * @param {int} port
 * @param {string} stage
 */
function jovoWebhook(port, stage) {
    let user;

    try {
        user = Helper.Project.getOrCreateJovoWebhookId();
    } catch (err) {
        console.log('Warning: Please initialize your project: $ jovo init');
        return;
    }

    try {
        if (!Helper.Project.getConfigParameter('endpoint', stage)) {
            // throw new Error('Warning: You haven\'t defined an endpoint in your app.json yet.');
        }

        if (_.startsWith(Helper.Project.getConfigParameter('endpoint', stage), 'arn')) {
            throw new Error('Warning: Your endpoint is a lambda endpoint. Lambda isn\'t supported with jovo webhook');
        }
    } catch (err) {
        if (_.startsWith(err.message, 'Warning:')) {
            console.log(err.message);
        }
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
    socket.on('connect_error', function(error) {
        console.log('Sorry, there seems to be an issue with the connection!');
        console.log(error);
    });
    socket.on('request-'+user, (data) => {
        post(data.request, port).then((result) => {
            socket.emit('response-' + user, result);
        }).catch((error) => {
            console.log('Local server did not return a valid JSON response:');
            console.log(error.rawData);
            socket.emit('response-' + user, null);
        });
    });
}

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
                    resolve(parsedData);
                } catch (e) {
                    e.rawData = rawData;
                    reject(e);
                }
            });
        }).on('error', (e) => {
            if (e.code === 'ECONNRESET') {
                e.message = 'Timeout error: No response after ' + 5000 + ' milliseconds';
            } else if (e.code === 'ECONNREFUSED') {
                e.message = 'There is no Jovo instance running on ' + opt.hostname;
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
