#!/usr/bin/env node
'use strict';
const program = require('commander');

program
    .version('0.4.11')
    .usage('[command] [options]');

program
    .command('new <directory>', 'new thing')
    .command('proxy [webhookFile]', "Creates a proxy according to your needs to finish your setup.");

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


