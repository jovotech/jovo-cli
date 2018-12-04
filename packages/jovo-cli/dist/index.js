#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Vorpal = require("vorpal");
const vorpal = new Vorpal();
require('dotenv').config();
const updateNotifier = require("update-notifier");
const pkg = require('../package.json');
const project = require('jovo-cli-core').getProject();
if (parseInt(process.version.substr(1, 2), 10) < 6) {
    console.error('Please use node version >= 6');
    process.exit(1);
}
const versionArg = ['-v', '-V', '--version'];
updateNotifier({ pkg }).notify();
if (process.argv.length === 2) {
    process.argv.push('help');
}
if (process.argv[2] !== 'new' &&
    versionArg.indexOf(process.argv[2]) === -1 &&
    process.argv[2] !== 'help' &&
    process.argv[2] !== 'deploy' &&
    process.argv[2] !== 'build' &&
    process.argv[2] !== 'init' &&
    process.argv[2] !== 'get' &&
    process.argv[2] !== 'run') {
    if (!project.isInProjectDirectory() && process.argv.indexOf('--help') === -1) {
        console.log('To use this command, please go into the directory of a valid Jovo project.');
        process.exit(1);
    }
}
if (process.argv.length <= 2) {
}
else if (process.argv.length === 3 &&
    (versionArg.indexOf(process.argv[2]) > -1)) {
    console.log('Jovo CLI Version: ' + require('./package').version);
}
else {
    vorpal
        .use(require('./commands/new.js'))
        .use(require('./commands/init.js'))
        .use(require('./commands/build.js'))
        .use(require('./commands/deploy.js'))
        .use(require('./commands/get.js'))
        .use(require('./commands/run.js'))
        .delimiter('')
        .show()
        .parse(process.argv);
}
//# sourceMappingURL=index.js.map