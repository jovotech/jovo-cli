'use strict';
const expect = require('chai').expect;
const tmpTestfolder = 'tmpTestfolderBuild';
const spawn = require('child_process').spawn;
const fs = require('fs');
const path = require('path');

const pathSep = path.sep;
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


describe('build', function() {
    it('jovo new <project> --init alexaSkill \n      jovo build', function(done) {
        this.timeout(12000);
        const projectName = 'helloworld';
        const projectFolder = tmpTestfolder + path.sep + projectName;
        let child = spawn('node', ['./../index.js', 'new', projectName,
            '-t', 'helloworldtest',
            '--init', 'alexaSkill',
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
                let childBuild = spawn('node', ['./../../index.js',
                    'build'], {
                    cwd: projectFolder,
                });
                childBuild.stdout.on('data', (data) => {
                    if (data.indexOf('Build completed.') > -1) {
                        childBuild.kill();
                        expect(fs.existsSync(projectFolder + path.sep + 'platforms'))
                            .to.equal(true);
                        expect(fs.existsSync(projectFolder + path.sep + 'platforms' + path.sep + 'alexaSkill'))
                            .to.equal(true);
                        expect(fs.existsSync(projectFolder + path.sep + 'platforms' + path.sep + 'alexaSkill' + path.sep + 'skill.json'))
                            .to.equal(true);
                        let skillJson = JSON.parse(fs.readFileSync(projectFolder + path.sep + 'platforms' + path.sep + 'alexaSkill' + path.sep + 'skill.json'));

                        expect(skillJson.manifest.publishingInformation.locales['en-US'].name)
                            .to.equal(projectName);
                        expect(skillJson.manifest.apis.custom.endpoint.uri.substr(0, 27))
                            .to.equal('https://webhook.jovo.cloud/');

                        expect(fs.existsSync(projectFolder + path.sep + 'platforms' + path.sep + 'alexaSkill' + path.sep + 'models' + path.sep + 'en-US.json'))
                            .to.equal(true);
                        let modelFile = JSON.parse(
                            fs.readFileSync(projectFolder + path.sep + 'platforms' + path.sep + 'alexaSkill' + path.sep + 'models' + path.sep + 'en-US.json'));

                        expect(modelFile.interactionModel.languageModel.invocationName)
                            .to.equal('my test app');
                        done();
                    }
                });
            }
        });
    });
    it('jovo new <project> --init googleAction \n      jovo build', function(done) {
        this.timeout(12000);
        const projectName = 'helloworld2';
        const projectFolder = tmpTestfolder + path.sep + projectName;
        let child = spawn('node', ['./../index.js', 'new', projectName,
            '-t', 'helloworldtest',
            '--init', 'googleAction',
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
                let childBuild = spawn('node', ['./../../index.js',
                    'build'], {
                    cwd: projectFolder,
                });
                childBuild.stdout.on('data', (data) => {
                    if (data.indexOf('Build completed.') > -1) {
                        childBuild.kill();
                        expect(
                            fs.existsSync(projectFolder + path.sep +
                                'platforms'))
                            .to.equal(true);
                        expect(
                            fs.existsSync(projectFolder + path.sep +
                                'platforms' + path.sep +
                                'googleAction'))
                            .to.equal(true);
                        expect(
                            fs.existsSync(projectFolder + path.sep +
                                'platforms' + path.sep +
                                'googleAction' + path.sep +
                                'dialogflow'))
                            .to.equal(true);

                        expect(
                            fs.existsSync(projectFolder + path.sep +
                                'platforms' + path.sep +
                                'googleAction' + path.sep +
                                'dialogflow' + path.sep +
                                'agent.json'))
                            .to.equal(true);
                        let agentJson = JSON.parse(
                            fs.readFileSync(projectFolder + path.sep +
                                'platforms' + path.sep +
                                'googleAction' + path.sep +
                                'dialogflow' + path.sep +
                                'agent.json'));

                        expect(agentJson.webhook.url.substr(0, 27))
                            .to.equal('https://webhook.jovo.cloud/');

                        expect(
                            fs.existsSync(projectFolder + path.sep +
                                'platforms' + path.sep +
                                'googleAction' + path.sep +
                                'dialogflow' + path.sep +
                                'intents'))
                            .to.equal(true);

                        expect(
                            fs.existsSync(projectFolder + path.sep +
                                'platforms' + path.sep +
                                'googleAction' + path.sep +
                                'dialogflow' + path.sep +
                                'intents' + path.sep +
                                'Default Fallback Intent.json'))
                            .to.equal(true);

                        expect(
                            fs.existsSync(projectFolder + path.sep +
                                'platforms' + path.sep +
                                'googleAction' + path.sep +
                                'dialogflow' + path.sep +
                                'intents' + path.sep +
                                'Default Welcome Intent.json'))
                            .to.equal(true);

                        expect(
                            fs.existsSync(projectFolder + path.sep +
                                'platforms' + path.sep +
                                'googleAction' + path.sep +
                                'dialogflow' + path.sep +
                                'intents' + path.sep +
                                'HelloWorldIntent.json'))
                            .to.equal(true);

                        expect(
                            fs.existsSync(projectFolder + path.sep +
                                'platforms' + path.sep +
                                'googleAction' + path.sep +
                                'dialogflow' + path.sep +
                                'intents' + path.sep +
                                'HelloWorldIntent_usersays_en-us.json'))
                            .to.equal(true);

                        expect(
                            fs.existsSync(projectFolder + path.sep +
                                'platforms' + path.sep +
                                'googleAction' + path.sep +
                                'dialogflow' + path.sep +
                                'intents' + path.sep +
                                'MyNameIsIntent.json'))
                            .to.equal(true);

                        expect(
                            fs.existsSync(projectFolder + path.sep +
                                'platforms' + path.sep +
                                'googleAction' + path.sep +
                                'dialogflow' + path.sep +
                                'intents' + path.sep +
                                'MyNameIsIntent_usersays_en-us.json'))
                            .to.equal(true);
                        done();
                    }
                });
            }
        });
    });

    it('jovo new <project> --init alexaSkill --build \n      jovo build --reverse', function(done) {
        this.timeout(12000);
        const projectName = 'helloworld_reverse_alexaSkill';
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

                fs.unlinkSync(projectFolder + path.sep + 'models' + path.sep + 'en-US.json');

                let childBuild = spawn('node', ['./../../index.js',
                    'build',
                    '--reverse'], {
                    cwd: projectFolder,
                });

                childBuild.stderr.on('data', (data) => {
                    console.log(data.toString());
                    done();
                });
                childBuild.stdout.on('data', (data) => {
                    if (data.indexOf('Build completed.') > -1) {
                        childBuild.kill();
                        expect(fs.existsSync(projectFolder + path.sep + 'models' + path.sep + 'en-US.json')).to.equal(true);
                        let modelJson = JSON.parse(
                            fs.readFileSync(
                                projectFolder + path.sep +
                                'models' + path.sep +
                                'en-US.json'));
                        expect(modelJson.invocation)
                            .to.equal('my test app');
                        done();
                    }
                });
            }
        });
    });

    it('jovo new <project> --init googleAction --build \n      jovo build --reverse', function(done) {
        this.timeout(12000);
        const projectName = 'helloworld_reverse_googleAction';
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

                fs.unlinkSync(projectFolder + path.sep + 'models' + path.sep + 'en-US.json');
                let childBuild = spawn('node', ['./../../index.js',
                    'build',
                    '--reverse'], {
                    cwd: projectFolder,
                });

                childBuild.stderr.on('data', (data) => {
                    console.log(data.toString());
                    done();
                });
                childBuild.stdout.on('data', (data) => {
                    if (data.indexOf('Build completed.') > -1) {
                        childBuild.kill();
                        expect(fs.existsSync(projectFolder + path.sep + 'models' + path.sep + 'en-US.json')).to.equal(true);
                        let modelJson = JSON.parse(
                            fs.readFileSync(
                                projectFolder + path.sep +
                                'models' + path.sep +
                                'en-us.json'));
                        expect(modelJson.invocation.length === 0)
                            .to.equal(true);
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
    }, 3000);
});
