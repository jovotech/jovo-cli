#!/usr/bin/env node
'use strict';
const program = require('commander');

program
    .version('0.6.0')
    .usage('[command] [options]');

program
    .command('new <directory>', 'Creates new project in directory')
    .command('run [webhookFile]', "Creates a public proxy to your local development.")

program.on('--help', function(){
    console.log();
    console.log('  Examples:');
    console.log('');
    console.log('     jovo new HelloWorld');
    console.log('     jovo new HelloWorld --template helloworld');
    console.log('     jovo run');
    console.log('     jovo run --watch');
    console.log('     jovo run index.js');
    console.log('     jovo run --bst-proxy');


    console.log('');
});


program.parse(process.argv);

if (!program.args.length) program.help();


