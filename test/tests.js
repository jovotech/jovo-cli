'use strict';
let assert = require('chai').assert;
const exec = require('child_process').exec;
const execSync = require('child_process').execSync;
const spawn = require('child_process').spawn;
const fs = require('fs');
let folder = 'testproject3';

/**
 * Deletes folder recursively
 * Found here: https://stackoverflow.com/a/32197381
 * @param {string} path
 */
let deleteFolderRecursive = function(path) {
    if( fs.existsSync(path) ) {
        fs.readdirSync(path).forEach(function(file,index){
            let curPath = path + "/" + file;
            if(fs.lstatSync(curPath).isDirectory()) { // recurse
                deleteFolderRecursive(curPath);
            } else { // delete file
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(path);
    }
};


describe('new <project>', function() {

    it('should create a project', function(done) {

        this.timeout(25000);

        exec('jovo new '+folder,
            (error, stdout, stderr) => {
                if(error) {
                    console.log(error);
                    return;
                }
                assert.ok(stdout.indexOf('You\'re all set.') > -1);
                done();
            });
    });

    it('should start the webhook without errors', function(done) {
        this.timeout(5000);
        let child = spawn('node', ['index.js'], {
            cwd: folder,
            detached: true,
        });
        child.stdout.on('data', (data) => {
            assert.ok(data.indexOf('Local development server listening on port 3000.') > -1);
            assert.ok(data.indexOf('error') === -1);
            child.kill();
            done();
        });

    });

});

describe('proxy', function() {
    it('should start the webhook without errors', function(done) {
        this.timeout(5000);
        let child = spawn('node', ['../jovo.js', 'proxy'], {
            cwd: folder,
            detached: true,
        });
        child.stdout.on('data', (data) => {
            assert.ok(data.indexOf('Local development server listening on port 3000.') > -1);
            assert.ok(data.indexOf('error') === -1);
            child.kill();
            done();
        });

    });

});

after(function() {
    deleteFolderRecursive(folder);
});
