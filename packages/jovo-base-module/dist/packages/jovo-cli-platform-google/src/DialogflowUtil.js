'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path_1 = require("path");
const archiver = require("archiver");
const _ = require("lodash");
const request = require("request");
const child_process_1 = require("child_process");
const admZip = require("adm-zip");
const GoogleActionUtil = require("./GoogleActionUtil");
const project = require('jovo-cli-core').getProject();
function getPath() {
    return path_1.join(GoogleActionUtil.getPath(), 'dialogflow');
}
exports.getPath = getPath;
function getIntentsFolderPath() {
    return path_1.join(getPath(), 'intents') + path_1.sep;
}
exports.getIntentsFolderPath = getIntentsFolderPath;
function getEntitiesFolderPath() {
    return path_1.join(getPath(), 'entities') + path_1.sep;
}
exports.getEntitiesFolderPath = getEntitiesFolderPath;
function getPackageJsonPath() {
    return path_1.join(getPath(), 'package.json');
}
exports.getPackageJsonPath = getPackageJsonPath;
function getPackageJson() {
    return require(getPackageJsonPath());
}
exports.getPackageJson = getPackageJson;
function getAgentJsonPath() {
    return path_1.join(getPath(), 'agent.json');
}
exports.getAgentJsonPath = getAgentJsonPath;
function getAgentJson() {
    try {
        return require(getAgentJsonPath());
    }
    catch (error) {
        throw error;
    }
}
exports.getAgentJson = getAgentJson;
function createEmptyAgentJson() {
    const agentJson = {
        description: '',
    };
    return agentJson;
}
exports.createEmptyAgentJson = createEmptyAgentJson;
function buildDialogFlowAgent(ctx) {
    return new Promise((resolve, reject) => {
        try {
            const config = project.getConfig(ctx.stage);
            let agent;
            try {
                agent = getAgentJson();
            }
            catch (err) {
                agent = createEmptyAgentJson();
            }
            let url = null;
            const globalConfig = project.getConfig();
            const stageConfig = _.get(project.getConfig(), `stages.${ctx.stage}`);
            url = _.get(stageConfig, 'googleAction.dialogflow.endpoint') ||
                _.get(stageConfig, 'endpoint.googleAction.dialogflow') ||
                _.get(stageConfig, 'endpoint') ||
                _.get(globalConfig, 'googleAction.dialogflow.endpoint') ||
                _.get(globalConfig, 'endpoint.googleAction.dialogflow') ||
                _.get(globalConfig, 'endpoint');
            url = project.getEndpointFromConfig(url);
            if (url) {
                _.merge(agent, {
                    'webhook': {
                        url,
                        available: true,
                    },
                });
            }
            if (ctx.locales && ctx.locales.length === 1) {
                let primaryLanguage = ctx.locales[0].substring(0, 2);
                if (['pt-br', 'zh-cn', 'zh-hk', 'zh-tw'].indexOf(ctx.locales[0].toLowerCase()) > -1) {
                    primaryLanguage = ctx.locales[0];
                }
                _.set(agent, 'language', primaryLanguage);
                delete agent.supportedLanguages;
            }
            else if (ctx.locales && ctx.locales.length > 1) {
                let primaryLanguage = ctx.locales[0].substring(0, 2);
                const prLanguages = ctx.locales.filter((locale) => {
                    return locale.length === 2;
                });
                if (prLanguages.length === 1) {
                    primaryLanguage = prLanguages[0];
                }
                if (['pt-br', 'zh-cn', 'zh-hk', 'zh-tw'].indexOf(ctx.locales[0].toLowerCase()) > -1) {
                    primaryLanguage = ctx.locales[0];
                }
                const supportedLanguages = [];
                primaryLanguage = _.get(stageConfig, 'googleAction.dialogflow.primaryLanguage') ||
                    _.get(globalConfig, 'googleAction.dialogflow.primaryLanguage') ||
                    primaryLanguage;
                ctx.locales.forEach((loc) => {
                    if (loc !== primaryLanguage) {
                        supportedLanguages.push(loc.toLowerCase());
                    }
                });
                _.set(agent, 'language', primaryLanguage.toLowerCase());
                _.set(agent, 'supportedLanguages', supportedLanguages);
            }
            if (_.get(config, 'googleAction.dialogflow.agent')) {
                _.merge(agent, config.googleAction.dialogflow.agent);
            }
            fs.writeFileSync(getPackageJsonPath(), JSON.stringify({
                version: '1.0.0',
            }, null, '\t'));
            fs.writeFile(getAgentJsonPath(), JSON.stringify(agent, null, '\t'), (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve();
            });
        }
        catch (err) {
            reject(err);
        }
    });
}
exports.buildDialogFlowAgent = buildDialogFlowAgent;
function getDefaultIntents() {
    return [
        {
            'name': 'Default Fallback Intent',
            'auto': true,
            'webhookUsed': true,
            'fallbackIntent': true,
        },
        {
            'name': 'Default Welcome Intent',
            'auto': true,
            'webhookUsed': true,
            'events': [
                {
                    'name': 'WELCOME',
                },
            ],
        },
    ];
}
exports.getDefaultIntents = getDefaultIntents;
function zip() {
    return new Promise((resolve, reject) => {
        const zipPath = path_1.join(GoogleActionUtil.getPath(), 'dialogflow_agent.zip');
        const output = fs.createWriteStream(zipPath);
        const archive = archiver('zip', {
            zlib: { level: 9 },
        });
        output.on('close', () => {
            resolve(zipPath);
        });
        output.on('end', () => {
        });
        archive.on('warning', (err) => {
            if (err.code === 'ENOENT') {
            }
            else {
                throw err;
            }
        });
        archive.on('error', (err) => {
            reject(err);
        });
        archive.pipe(output);
        const file1 = path_1.join(getPath(), 'package.json');
        archive.append(fs.createReadStream(file1), { name: 'package.json' });
        const file2 = path_1.join(getPath(), 'agent.json');
        archive.append(fs.createReadStream(file2), { name: 'agent.json' });
        archive.directory(getIntentsFolderPath(), 'intents');
        if (fs.existsSync(getEntitiesFolderPath())) {
            archive.directory(getEntitiesFolderPath(), 'entities');
        }
        archive.finalize();
    });
}
exports.zip = zip;
exports.v2 = {
    checkGcloud() {
        return new Promise((resolve, reject) => {
            try {
                child_process_1.exec('gcloud -v', (error, stdout, stderr) => {
                    if (error) {
                        if (stderr) {
                            return reject(new Error('Your Google Cloud SDK isn\'t installed properly'));
                        }
                    }
                    if (!_.startsWith(stdout, 'Google Cloud SDK')) {
                        return reject(new Error('Your Google Cloud SDK isn\'t installed properly'));
                    }
                    resolve();
                });
            }
            catch (error) {
                console.log(error);
            }
        });
    },
    activateServiceAccount(config) {
        return new Promise((resolve, reject) => {
            try {
                child_process_1.exec('gcloud auth activate-service-account --key-file="' + config.keyFile + '"', (error, stdout, stderr) => {
                    if (error) {
                        if (stderr || error) {
                            return reject(new Error('Could not activate your service account: ' + stderr));
                        }
                    }
                    resolve();
                });
            }
            catch (error) {
                console.log(error);
            }
        });
    },
    getAccessToken() {
        return new Promise((resolve, reject) => {
            try {
                child_process_1.exec('gcloud auth print-access-token', (error, stdout, stderr) => {
                    if (error) {
                        if (stderr) {
                            console.log(stderr);
                        }
                    }
                    resolve(stdout);
                });
            }
            catch (error) {
                console.log(error);
            }
        });
    },
    exportAgent(config) {
        return new Promise((resolve, reject) => {
            this.getAccessToken().then((accessToken) => {
                const options = {
                    method: 'POST',
                    url: `https://dialogflow.googleapis.com/v2beta1/projects/${config.projectId}/agent:export`,
                    headers: {
                        Authorization: `Bearer ${accessToken.trim()}`,
                        accept: 'application/json',
                    },
                };
                request(options, (error, response, body) => {
                    if (error) {
                        return reject(error);
                    }
                    if (response.body.error) {
                        return reject(new Error(response.body.error.message));
                    }
                    try {
                        const res = JSON.parse(body);
                        if (res.error) {
                            return reject(new Error(res.error.message));
                        }
                        const buf = Buffer.from(res.response.agentContent, 'base64');
                        resolve(buf);
                    }
                    catch (e) {
                        return reject(new Error(`Can't parse response object`));
                    }
                });
            });
        });
    },
    restoreAgent(config) {
        return new Promise((resolve, reject) => {
            this.getAccessToken().then((accessToken) => {
                const zipdata = fs.readFileSync(config.pathToZip);
                const content = {
                    agentContent: new Buffer(zipdata).toString('base64'),
                };
                const options = {
                    method: 'POST',
                    url: `https://dialogflow.googleapis.com/v2beta1/projects/${config.projectId}/agent:restore`,
                    headers: {
                        Authorization: `Bearer ${accessToken.trim()}`,
                        accept: 'application/json',
                        'Content-Type': 'application/json'
                    },
                    json: content,
                };
                request(options, (error, response, body) => {
                    if (error) {
                        return reject(error);
                    }
                    if (response.body.error) {
                        return reject(new Error(response.body.error.message));
                    }
                    resolve();
                });
            });
        });
    },
    trainAgent(config) {
        return new Promise((resolve, reject) => {
            this.getAccessToken().then((accessToken) => {
                const options = {
                    method: 'POST',
                    url: `https://dialogflow.googleapis.com/v2beta1/projects/${config.projectId}/agent:train`,
                    headers: {
                        Authorization: `Bearer ${accessToken.trim()}`,
                        accept: 'application/json',
                        'Content-Type': 'application/json',
                    },
                };
                request(options, (error, response, body) => {
                    if (error) {
                        return reject(error);
                    }
                    if (response.body.error) {
                        return reject(new Error(response.body.error.message));
                    }
                    resolve(body);
                });
            });
        });
    },
};
function getAgentFiles(config) {
    return exports.v2.exportAgent(config).then((buf) => {
        const zip = new admZip(buf);
        zip.extractAllTo(getPath(), true);
    });
}
exports.getAgentFiles = getAgentFiles;
//# sourceMappingURL=DialogflowUtil.js.map