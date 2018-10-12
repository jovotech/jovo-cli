'use strict';
const chai = require('chai');
const assert = chai.assert;
const expect = chai.expect;
const tmpTestfolder = 'tmpTestfolderRun';
const projectName = 'helloworldRun';
const execFile = require('child_process').execFile;
const spawn = require('child_process').spawn;
const fs = require('fs');
const path = require('path');

const pathSep = path.sep;
const projectFolder = tmpTestfolder + pathSep + projectName;

/**
 * Deletes folder recursively
 * Found here: https://stackoverflow.com/a/32197381
 * @param {string} path
 */
let deleteFolderRecursive = function(path) {
    if ( fs.existsSync(path) ) {
        fs.readdirSync(path).forEach(function(file, index) {
            let curPath = path + pathSep + file;
            if (fs.lstatSync(curPath).isDirectory()) { // recurse
                deleteFolderRecursive(curPath);
            } else { // delete file
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(path);
    }
};

describe('run', function() {
    before(function(done) {
        this.timeout(30000);

        deleteFolderRecursive(tmpTestfolder);
        if (!fs.existsSync(tmpTestfolder)) {
            fs.mkdirSync(tmpTestfolder);
        }

        // set up test app that the tests will run against
        execFile('node', ['./../index.js',
            'new', projectName,
            '-t', 'helloworldtest',
            ], {
                cwd: tmpTestfolder,
            }, (error, stdout, stderr) => {
                if (error) {
                    done(new Error(error));
                }

                if (stderr) {
                    done(new Error(stderr));
                }

                if (stdout.indexOf('Installation completed.') === -1) {
                    done(new Error(`Expected \'Installation completed.\' but found ''${stdout}''`));
                }

                done();
            });
    });

    it('jovo run', function(done) {
        this.timeout(200000);

        let childRun = spawn('node', ['./../../index.js',
            'run'], {
            cwd: projectFolder,
        });
        let fullData = '';
        childRun.stderr.on('data', (data) => {
            assert.ok(false, data.toString());
        });
        childRun.stdout.on('data', (data) => {
            fullData += data.toString();
        });
        childRun.on('exit', () => {
            done();
        });

        setTimeout(() => {
            childRun.kill();
            expect(fullData).to.contain('Example server listening on port 3000!');
        }, 8000);
    });

    it('jovo run --bst-proxy', function(done) {
        this.timeout(200000);

        let childRun = spawn('node', ['./../../index.js',
            'run',
            '--bst-proxy'], {
            cwd: projectFolder,
        });
        let fullData = '';
        childRun.stderr.on('data', (data) => {
            assert.ok(false, data.toString());
        });
        childRun.stdout.on('data', (data) => {
            fullData += data.toString();
        });
        childRun.on('exit', () => {
            done();
        });

        setTimeout(() => {
            childRun.kill();

            const validation =
                // If proxy has already being run a configuration exists
                fullData.indexOf('Example server listening on port 3000!') > -1 ||
                // If proxy haven't run, one is created
                fullData.indexOf('info: CONFIG      No configuration. Creating one') > -1;
            assert.ok(validation);
        }, 8000);
    });

    after(function(done) {
        this.timeout(10000);
        setTimeout(function() {
            deleteFolderRecursive(tmpTestfolder);
            done();
        }, 2000);
    });
});
