'use strict';
const exec = require('child_process').exec;

const expect = require('chai').expect;
const tmpTestfolder = 'tmpTestfolderDeploy';
const spawn = require('child_process').spawn;
const fs = require('fs');
const path = require('path');

const pathSep = path.sep;

let askProfile = process.env.ASK_PROFILE;

if (process.argv.indexOf('--ask-profile') > -1) {
    askProfile = process.argv[process.argv.indexOf('--ask-profile') + 1];
}

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

before(function(done) {
    this.timeout(5000);
    deleteFolderRecursive(tmpTestfolder);
    if (!fs.existsSync(tmpTestfolder)) {
        fs.mkdirSync(tmpTestfolder);
    }
    done();
});


describe('deploy', function() {
    it('jovo new <project> --init alexaSkill --build\n      jovo deploy', function(done) {
        this.timeout(200000);
        if (!askProfile) {
            console.log('Skipping');
            this.skip();
        } else {
            const projectName = 'jovo-cli-unit-test';
            const projectFolder = tmpTestfolder + path.sep + projectName;
            let child = spawn('node', ['./../index.js', 'new', projectName,
                '-t', 'helloworldtest',
                '--init', 'alexaSkill',
                '--build',
                '--skip-npminstall'], {
                cwd: tmpTestfolder,
            });
            child.stderr.on('data', (data) => {
                console.log(data.toString());
                done();
            });
            child.stdout.on('data', (data) => {
                if (data.indexOf('Installation completed.') > -1) {
                    child.kill();

                    let childDeploy = spawn('node', ['./../../index.js',
                        'deploy',
                        '--ask-profile', askProfile,
                        ], {
                        cwd: projectFolder,
                    });
                    childDeploy.stdout.on('data', (data) => {
                        if (data.indexOf('Deployment completed.') > -1) {
                            childDeploy.kill();
                            let askConfig = JSON.parse(
                                fs.readFileSync(
                                    projectFolder + path.sep +
                                    'platforms' + path.sep +
                                    'alexaSkill' + path.sep +
                                    '.ask' + path.sep +
                                    'config'));
                            expect(askConfig.deploy_settings.default.skill_id.length > 0)
                                .to.equal(true);
                            deleteSkill(askConfig.deploy_settings.default.skill_id, function() {
                                done();
                            });
                        }
                    });
                }
            });
        }
    });

    it('jovo new <project> --init googleAction --build\n      jovo deploy', function(done) {
        this.timeout(200000);
        const projectName = 'helloworldDeployGoogleAction';
        const projectFolder = tmpTestfolder + path.sep + projectName;
        let child = spawn('node', ['./../index.js', 'new', projectName,
            '-t', 'helloworldtest',
            '--init', 'googleAction',
            '--build',
            '--skip-npminstall'], {
            cwd: tmpTestfolder,
        });
        child.stderr.on('data', (data) => {
            console.log(data.toString());
            done();
        });
        child.stdout.on('data', (data) => {
            if (data.indexOf('Installation completed.') > -1) {
                child.kill();

                let childDeploy = spawn('node', ['./../../index.js',
                    'deploy',
                ], {
                    cwd: projectFolder,
                });
                childDeploy.stdout.on('data', (data) => {
                    if (data.indexOf('Deployment completed.') > -1) {
                        childDeploy.kill();
                        expect(
                            fs.existsSync(
                                projectFolder + path.sep +
                                'platforms' + path.sep +
                                'googleAction' + path.sep +
                                'dialogflow_agent.zip')).to.equal(true);
                        done();
                    }
                });
            }
        });
    });
});


after(function(done) {
    this.timeout(5000);
    setTimeout(function() {
        deleteFolderRecursive(tmpTestfolder);
        done();
    }, 2000);
});


/**
 * Deletes skill from ASK
 * @param {string} skillId
 * @param {function} callback
 */
function deleteSkill(skillId, callback) {
    exec('ask api delete-skill --skill-id ' + skillId, {
    }, function(error, stdout, stderr ) {
        if (error) {
            console.log(error);
            if (stderr) {
                console.log(stderr);
            }
        }
        if (stdout.indexOf('Skill deleted successfully.') > -1) {
            callback();
        }
    });
}
