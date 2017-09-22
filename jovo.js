#!/usr/bin/env node
'use strict';
const download = require('download-github-repo');
const ora = require('ora');
const program = require('commander');
const exec = require('child_process').exec;
const downloadSpinner = ora('Downloading project files');
const installSpinner = ora('Installing dependencies');



program
    .version('0.4.11')
    .usage('[command] [options]');

program
    .command('new <directory>', 'new thing')
    .command('proxy <lambda|function>', "Creates a proxy according to your needs to finish your setup.");

program.on('--help', function(){
    console.log();
    console.log('  Examples:');
    console.log('');
    console.log('     jovo new HelloWorld');
    console.log('     jovo new HelloWorld --template helloworld');
    console.log('');
});


program.parse(process.argv);

if (!program.args.length) program.help();


