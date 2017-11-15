#!/usr/bin/env node
'use strict';
const ora = require('ora');
const program = require('commander');
const exec = require('child_process').exec;
const downloadSpinner = ora('Downloading project files');
const installSpinner = ora('Installing dependencies');
const fs = require('fs');
const path = require('path');
const request = require('request');
const AdmZip = require('adm-zip');


program
    .usage("<directory>")
    .description('create new project into given directory')
    .option('-t, --template [templateName]', 'Create new project based on specific template. (helloworld)',/^(helloworld|audioPlayer)$/i, 'helloworld')
    .action(function(folder, options){
        console.log('I\'m setting everything up');

        let templates = {
            'helloworld' : 'jovo-sample-voice-app-nodejs',
            // 'audioplayer': 'jovo-sample-voice-app-nodejs',
        };

        let template = 'helloworld';

        if(options.template) {
            template = options.template.toLowerCase();


            if(!templates[template]) {
                console.log('Template "'+template+'" can\'t be found.');
                console.log('Available templates:');
                for(let i = 0; i < Object.keys(templates).length; i++) {
                    console.log(Object.keys(templates)[i]);
                }
                console.log();
                return;
            }
        }

        let reg = /^[0-9a-zA-Z-_]+$/;
        if(!reg.test(folder)) {
            console.log('Please use a valid folder name.')
            return;
        }


        downloadSpinner.start();
        download(templates[template], folder, function(err) {
            if(err) {
                downloadSpinner.fail('Something went wrong while downloading')
                console.log(err);
                return;
            }

            downloadSpinner.succeed('Download successful');

            installSpinner.start();
            let child = exec('npm install', {
                    cwd: folder }
                ,
                function(error, stdout, stderr) {
                    if(error) {
                        installSpinner.fail('Something went wrong while installing')
                        console.log(error);
                        return;
                    }

                    installSpinner.succeed('Installation successful');
                    console.log();
                    console.log('You\'re all set.');
                    console.log('Go into the folder and type "jovo run" to start the server');
                });
        });
    }).on('--help', function() {
    console.log();
    console.log('  Examples:');
    console.log();
    console.log('    jovo new HelloWorld --template helloworld');
    console.log();
});

program.parse(process.argv);

/**
 * Downloads and extracts sample project
 * @param {string} template
 * @param {string} folder
 * @param callback
 */
function download(template, folder, callback) {
    let newPath = process.cwd() + path.sep + folder;
    if (!fs.existsSync(newPath)) {
        fs.mkdirSync(newPath);
    }

    const REPO_URL = 'https://www.jovo.tech/repo/sample-apps/'+template+'.zip';
    request(REPO_URL)
        .pipe(fs.createWriteStream(newPath + path.sep + template+'.zip')).on('close', function () {
            let zip = new AdmZip(newPath + path.sep + template+'.zip');

        zip.extractAllTo(newPath, true);
        fs.unlinkSync(newPath + path.sep + template+'.zip');
        callback()
    }).on('error', function(err) {
        callback(err);
    });
}