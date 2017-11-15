#!/usr/bin/env node
'use strict';
const program = require('commander');
const childProcess = require('child_process');
const BSTProxy = require('bespoken-tools').BSTProxy;
const fs = require("fs");
const path = require("path");
const spawn = require('cross-spawn');
function getUserHome() {
    return process.env[(process.platform === "win32") ? "USERPROFILE" : "HOME"];
}
program
    .description("Runs the jovo app.")
    .option('-h, --http', 'Creates http webhook endpoint (default)')
    .option('-b, --bst-proxy', 'Proxies the HTTP service running at the specified port via bst')
    .option('-w, --watch', 'Uses nodemon to watch files. Restarts immediately on file change.')
    .action( function (webhookFile, options) {
        if(options.bstProxy) {
            const proxy = BSTProxy.http(3000);

            proxy.start(() => {
                const data = fs.readFileSync(path.join(getUserHome(), ".bst/config"));
                const bstConfig = JSON.parse(data.toString());
                const proxyURL = "https://" + bstConfig.sourceID + ".bespoken.link/webhook";
                const dashboardURL = "https://bespoken.tools/dashboard?id=" + bstConfig.sourceID + "&key=" + bstConfig.secretKey;
                let messageOutput = "Your public URL for accessing your local service:\n";
                messageOutput += proxyURL + "\n\n";
                messageOutput += "Your URL for viewing requests/responses sent to your service:\n";
                messageOutput += dashboardURL + "\n\n";
                messageOutput += "Copy and paste this to your browser to view your transaction history and summary data.\n";
                console.log(messageOutput);
            });
        }

        const localServerFile = webhookFile ? webhookFile : "index.js";

        let command = 'node';
        if(options.watch) {
            command = process.mainModule.paths[0] + path.sep + 'nodemon' + path.sep + 'bin' + path.sep + 'nodemon.js';
        }
        const ls = spawn(command, ['./'+localServerFile, '--ignore \'./db\''], { stdio: 'inherit', cwd: process.cwd() });
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

// calling the command without parameters doesn't route to this file correctly. Adding default parameter manually
// if not provided.
if (process.argv.length === 2 || process.argv[2].indexOf('.js') === -1) {
    process.argv.splice(2, 0, "index.js");
}


program.parse(process.argv);
