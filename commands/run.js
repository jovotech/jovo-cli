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
const querystring = require('querystring');
/**
 * Returns path to home directory
 * @return {string}
 */
function getUserHome() {
    return process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME'];
}

if (process.argv.indexOf('run') > 0 &&
    process.argv.indexOf('help') < 0 &&
    (process.argv.length === 3 || process.argv[3].indexOf('.js') === -1)) {
    process.argv.splice(3, 0, 'index.js');
}

module.exports = function(vorpal) {
    vorpal
        .command('run <webhookFile>', 'run')
        .allowUnknownOptions()
        .description('Runs a local development server (webhook).')
        .option('-b, --bst-proxy', 'Proxies the HTTP service running at the specified port via bst')
        .option('-n, --ngrok', 'Http tunnel via ngrok. Ngrok instance has to run.')
        .option('-p, --port <port>', 'Port to local development webhook')
        .option('-i, --inspect [inspectPort]', 'Debugging port')
        .option('--stage <stage>', 'Takes configuration from <stage>')
        .option('-w, --watch', 'Uses nodemon to watch files. Restarts immediately on file change.')
        .option('--webhook-only', 'Starts the Jovo Webhook proxy without executing the code')
        .option('--disable-jovo-debugger', 'Disables Jovo Debugger (web version)')
        .option('--model-test', 'Activates the language model test')
        .option('--timeout <timeout>', 'Sets timeout in milliseconds')
        .option('-r, --record <name>', 'Can be used to record requests and responses of your Jovo app for testing purposes.')
        .action((args, callback) => {
            const port = args.options.port || 3000;
            let timeout = args.options.timeout || 5000;

            const stage = Helper.Project.getStage(args.options.stage);


            try {
                Helper.Project.getConfig(stage);
            } catch (e) {
                console.log('\n\n Could not load app.json. \n\n');
                callback();
                return;
            }

            if (args.options['webhook-only']) {
                jovoWebhook({
                    port: port,
                    timeout: timeout,
                }, stage);
                return;
            }
            let srcDir = '';
            // prepend src directory from config
            if (Helper.Project.getConfigParameter('src', stage)) {
                srcDir = Helper.Project.getConfigParameter('src', stage);
                if (srcDir && !_.endsWith(path.sep, srcDir )) {
                    srcDir = srcDir + path.sep;
                }
            }

            const localServerFile = args.webhookFile === 'index.js' ? 'index.js' : args.webhookFile;
            let command = 'node';
            if (args.options.watch) {
                command = resolveBin.sync('nodemon');
            }

            let parameters = ['./'+localServerFile, '--ignore', 'db/*', '--ignore', 'test/*'];

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

            if (stage) {
                parameters.push('--stage');
                parameters.push(stage);
            }

            if (args.options['disable-jovo-debugger']) {
                parameters.push('--disable-jovo-debugger');
            }

            if (args.options['model-test']) {
                parameters.push('--model-test');
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
                jovoWebhook({
                    port: port,
                    timeout: timeout,
                }, stage);
                parameters.push('--jovo-webhook');
            }
            const ls = spawn(command, parameters, {windowsVerbatimArguments: true, stdio: 'inherit', cwd: srcDir || process.cwd()});

            // Ensure our child process is terminated upon exit. This is needed in the situation
            // where we're on Linux and are the child of another process (grandchild processes are orphaned in Linux).
            process.on('exit', () => {
                ls.kill();
            });
        });
};


/**
 * Initializes connection to the Jovo Webhook
 * @param {*} options
 * @param {string} stage
 */
function jovoWebhook(options, stage) {
    let id;

    try {
        id = Helper.Project.getOrCreateJovoWebhookId();
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
            id: id,
        },
    });
    socket.on('connect', function() {
        console.log('This is your webhook url: ' + Helper.JOVO_WEBHOOK_URL + '/' + id);
    });
    socket.on('connect_error', function(error) {
        console.log('Sorry, there seems to be an issue with the connection!');
        console.log(error);
    });
    socket.on('request-' + id, (data) => {
        post(data.request, data.headers, data.params, options).then((result) => {
            socket.emit('response-' + id, result);
        }).catch((error) => {
            console.log('Local server did not return a valid JSON response:');
            console.log(error.rawData);
            socket.emit('response-' + id, null);
        });
    });
}

/**
 * Send post requests to local webhook
 * @param {*} requestObj
 * @param {*} headers
 * @param (*} params
 * @param {*} options
 * @return {Promise<any>}
 */
function post(requestObj, headers, params, options) {
    return new Promise((resolve, reject) => {
        const defaultHeaders = {
            'content-type': 'application/json',
        };
        headers = _.merge(defaultHeaders, headers);
        delete headers['host'];
        delete headers['content-length'];
        const queryParams = querystring.stringify(params);
        let opt = {
            hostname: 'localhost',
            port: options.port,
            path: '/webhook?'+ queryParams,
            method: 'POST',
            headers: headers,

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
                e.message = 'Timeout error: No response after ' + options.timeout + ' milliseconds';
            } else if (e.code === 'ECONNREFUSED') {
                e.message = 'There is no Jovo instance running on ' + opt.hostname;
            }
            reject(e);
        }).on('socket', function(socket) {
            socket.setTimeout(options.timeout);
            socket.on('timeout', function() {
                req.abort();
            });
        });
        req.write(postData);
        req.end();
    });
}
