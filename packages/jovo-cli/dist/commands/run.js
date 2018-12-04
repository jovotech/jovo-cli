#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
const fs = require("fs");
const JovoWebhookConnector = require("jovo-webhook-connector");
const path = require("path");
const resolveBin = require('resolve-bin');
const spawn = require("cross-spawn");
const bespoken_tools_1 = require("bespoken-tools");
const Platforms = require("../utils/Platforms");
const Utils_1 = require("../utils/Utils");
const jovo_cli_core_1 = require("jovo-cli-core");
const { promisify } = require('util');
const accessAsync = promisify(fs.access);
const project = jovo_cli_core_1.getProject();
if (process.argv.indexOf('run') > 0 &&
    process.argv.indexOf('help') < 0 &&
    (process.argv.length === 3 || process.argv[3].indexOf('.js') === -1)) {
    process.argv.splice(3, 0, 'index.js');
}
module.exports = (vorpal) => {
    let DEBUG = false;
    const vorpalCommand = vorpal
        .command('run <webhookFile>', 'run')
        .allowUnknownOptions()
        .description('Runs a local development server (webhook).')
        .option('-b, --bst-proxy', 'Proxies the HTTP service running at the specified port via bst')
        .option('-p, --port <port>', 'Port to local development webhook')
        .option('-i, --inspect [inspectPort]', 'Debugging port')
        .option('--stage <stage>', 'Takes configuration from <stage>')
        .option('-w, --watch', 'Uses nodemon to watch files. Restarts immediately on file change.')
        .option('--webhook-only', 'Starts the Jovo Webhook proxy without executing the code')
        .option('--disable-jovo-debugger', 'Disables Jovo Debugger (web version)')
        .option('--model-test', 'Activates the language model test')
        .option('--timeout <timeout>', 'Sets timeout in milliseconds')
        .option('-r, --record <name>', 'Can be used to record requests and responses of your Jovo app for testing purposes.')
        .option('\n');
    Platforms.addCliOptions('run', vorpalCommand);
    Utils_1.addBaseCliOptions(vorpalCommand);
    vorpalCommand
        .action(async (args) => {
        DEBUG = args.options.debug ? true : false;
        await project.init();
        const port = args.options.port || 3000;
        const timeout = args.options.timeout || 5000;
        const stage = project.getStage(args.options.stage);
        try {
            project.getConfig(stage);
        }
        catch (e) {
            console.log('\n\n Could not load app.json. \n\n');
            return Promise.resolve();
        }
        if (args.options['webhook-only']) {
            jovoWebhook({
                port,
                timeout,
            }, stage);
            return;
        }
        let srcDir;
        if (project.getConfigParameter('src', stage)) {
            srcDir = project.getConfigParameter('src', stage);
            if (srcDir && !_.endsWith(path.sep, srcDir)) {
                srcDir = srcDir + path.sep;
            }
        }
        const localServerFile = args.webhookFile === 'index.js' ? 'index.js' : args.webhookFile;
        let command = 'node';
        if (args.options.watch) {
            command = resolveBin.sync('nodemon');
        }
        const checkFolders = [];
        const projectFolder = project.getConfigParameter('src', stage);
        if (projectFolder) {
            checkFolders.push(projectFolder);
        }
        if (project.frameworkVersion === 2) {
            checkFolders.push('./src/');
        }
        checkFolders.push('./');
        let executeFilePath = undefined;
        for (let i = 0; i < checkFolders.length; i++) {
            try {
                await accessAsync(checkFolders[i] + localServerFile);
                executeFilePath = checkFolders[i] + localServerFile;
                break;
            }
            catch (e) { }
        }
        if (executeFilePath === undefined) {
            console.error('Could not find a project to run.');
            return Promise.resolve();
        }
        const parameters = [executeFilePath, '--ignore', 'db/*', '--ignore', 'test/*'];
        if (args.options.record) {
            parameters.push('--record');
            parameters.push(args.options.record);
        }
        if (args.options.inspect) {
            let inspectPort = 9229;
            if (_.isNumber(args.options.inspect)) {
                inspectPort = parseInt(args.options.inspect.toString(), 10);
            }
            parameters.unshift('--inspect=' + inspectPort);
        }
        parameters.push('--webhook');
        if (srcDir && srcDir.length > 0) {
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
            const proxy = bespoken_tools_1.BSTProxy.http(port);
            proxy.start(() => {
                const data = fs.readFileSync(path.join(jovo_cli_core_1.Utils.getUserHome(), '.bst/config'));
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
        }
        else {
            jovoWebhook({
                port,
                timeout,
            }, stage);
            parameters.push('--jovo-webhook');
        }
        const ls = spawn(command, parameters, { windowsVerbatimArguments: true, stdio: 'inherit', cwd: srcDir || process.cwd() });
        process.on('exit', () => {
            ls.kill();
        });
        return new Promise(() => { });
    });
};
function jovoWebhook(options, stage) {
    let id;
    try {
        id = project.getOrCreateJovoWebhookId();
    }
    catch (err) {
        console.log('Warning: Please initialize your project: $ jovo init');
        return;
    }
    try {
        if (!project.getConfigParameter('endpoint', stage)) {
        }
        if (_.startsWith(project.getConfigParameter('endpoint', stage), 'arn')) {
            throw new Error('Warning: Your endpoint is a lambda endpoint. Lambda isn\'t supported with jovo webhook');
        }
    }
    catch (err) {
        if (_.startsWith(err.message, 'Warning:')) {
            console.log(err.message);
        }
    }
    JovoWebhookConnector.open(id, jovo_cli_core_1.JOVO_WEBHOOK_URL, { post: options });
}
//# sourceMappingURL=run.js.map