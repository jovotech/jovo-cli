#!/usr/bin/env node
'use strict';
const BSTProxy = require('bespoken-tools').BSTProxy;
const fs = require('fs');
const path = require('path');
const spawn = require('cross-spawn');

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
        .description('Runs the jovo app.')
        .option('-h, --http', 'Creates http webhook endpoint (default)')
        .option('-b, --bst-proxy', 'Proxies the HTTP service running at the specified port via bst')
        .option('-w, --watch', 'Uses nodemon to watch files. Restarts immediately on file change.')
        .action((args) => {
            if (args.options['bst-proxy']) {
                const proxy = BSTProxy.http(3000);

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
            }

            const localServerFile = args.webhookFile ? args.webhookFile : 'index.js';

            let command = 'node';
            if (args.options.watch) {
                command = process.mainModule.paths[0] + path.sep + 'nodemon' + path.sep + 'bin' + path.sep + 'nodemon.js';
            }

            let parameters = ['./'+localServerFile, '--ignore db/*'];

            parameters.push('--webhook');
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
        })
        .help((args) => {

        });
};
