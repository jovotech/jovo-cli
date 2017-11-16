'use strict';
let assert = require('chai').assert;
const exec = require('child_process').exec;
const execSync = require('child_process').execSync;
const spawn = require('child_process').spawn;
const fs = require('fs');
const path = require("path");

const pathSep = path.sep;

let folder = 'testproject3';

/**
 * Deletes folder recursively
 * Found here: https://stackoverflow.com/a/32197381
 * @param {string} path
 */
let deleteFolderRecursive = function(path) {
    if( fs.existsSync(path) ) {
        fs.readdirSync(path).forEach(function(file,index){
            let curPath = path + pathSep + file;
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

        this.timeout(40000);

        exec('node jovo.js new '+folder,
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
        this.timeout(10000);
        let child = spawn('node', ['index.js'], {
            cwd: folder,
            // detached: true,
        });
        child.stdout.on('data', (data) => {
            assert.ok(data.indexOf('Local development server listening on port 3000.') > -1);
            assert.ok(data.indexOf('error') === -1);
            child.kill();
            done();
        });

    });

});

//TODO: more tests required
describe('bst-proxy', function() {
    it('should start the webhook without errors', function(done) {
        this.timeout(15000);
        let child = spawn('node', ['..'+path.sep+'jovo.js', 'run', 'index.js', '--bst-proxy'], {
            cwd: folder,
            // detached: true,
        });
        let fullData = '';
        child.stdout.on('data', (data) => {
            fullData += data.toString();
        });
        setTimeout(() => {
            const validation =
                // If proxy has already being run a configuration exists
                fullData.indexOf('Local development server listening on port 3000.') > -1 ||
                // If proxy haven't run, one is created
                fullData.indexOf('info: CONFIG      No configuration. Creating one') > -1;
            assert.ok(validation);
            child.kill();
            done();
        }, 3000)

    });

});

after(function(done) {
    this.timeout(5000);
    deleteFolderRecursive(folder);
    done();
});
