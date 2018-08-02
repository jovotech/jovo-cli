#!/usr/bin/env node

const vorpal = require('vorpal')();
const Helper = require('./helper/lmHelper');
require('dotenv').config();
const updateNotifier = require('update-notifier');
const pkg = require('./package.json');

if (parseInt(process.version.substr(1, 2)) < 6) {
    console.error('Please use node version >= 6');
    process.exit(1);
}
const versionArg = ['-v', '-V', '--version'];

updateNotifier({pkg}).notify();

// jovo  (no arguments)
if (process.argv.length === 2) {
   process.argv.push('help');
}


// check for valid Jovo project directory
if (process.argv[2] !== 'new' &&
    versionArg.indexOf(process.argv[2]) === -1 &&
    process.argv[2] !== 'help' &&
    process.argv[2] !== 'deploy' &&
    process.argv[2] !== 'build' &&
    process.argv[2] !== 'init' &&
    process.argv[2] !== 'get' &&
    process.argv[2] !== 'run') {
    if (!Helper.Project.isInProjectDirectory() && process.argv.indexOf('--help') === -1) {
        console.log('To use this command, please go into the directory of a valid Jovo project.');
        process.exit(1);
    }
}


if (process.argv.length <= 2) {
} else if (process.argv.length === 3 &&
    (versionArg.indexOf(process.argv[2]) > -1)) {
    console.log('Jovo CLI Version: ' + require('./package').version);
} else {
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

