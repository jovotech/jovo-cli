'use strict';
const fs = require('fs');
const path = require('path');
const exec = require('child_process').exec;
const _ = require('lodash');
const request = require('request');
const AdmZip = require('adm-zip');
const uuidv4 = require('uuid/v4');

const DEFAULT_LOCALE = 'en-US';
const DEFAULT_PLATFORM = 'none';
const DEFAULT_TEMPLATE = 'helloworld';
const DEFAULT_TARGET = 'all';
const DEFAULT_ENDPOINT = 'jovo-webhook';
const DEFAULT_ASK_PROFILE = 'default';

const TARGET_ALL = 'all';
const TARGET_INFO = 'info';
const TARGET_MODEL = 'model';
const TARGET_LAMBDA = 'lambda';

const PLATFORM_ALL = 'all';
const PLATFORM_ALEXASKILL = 'alexaSkill';
const PLATFORM_GOOGLEACTION = 'googleAction';
const PLATFORM_NONE = 'none';

const ENDPOINT_NGROK = 'ngrok';
const ENDPOINT_BSTPROXY = 'bst-proxy';
const ENDPOINT_JOVOWEBHOOK = 'jovo-webhook';
const ENDPOINT_NONE = 'none';


const JOVO_WEBHOOK_URL = 'https://webhook.jovo.cloud';


const REPO_URL = 'http://www.jovo.tech/repo/sample-apps/v1/';

let projectPath = process.cwd();


module.exports.Project = {

    /**
     * Sets project path
     * @param {String} projectName
     */
    setProjectPath: function(projectName) {
        projectPath += path.sep + projectName;
    },

    /**
     * Returns full project path
     * @return {string}
     */
    getProjectPath: function() {
        return projectPath + path.sep;
    },

    /**
     * Returns project name extracted from project path
     * @return {string}
     */
    getProjectName: function() {
        let split = projectPath.split(path.sep);
        return split[split.length-1];
    },


    /**
     * Checks if working directory is in a project
     * @return {boolean}
     */
    isInProjectDirectory: function() {
        return fs.existsSync(this.getProjectPath() + 'index.js') &&
            fs.existsSync(this.getProjectPath() + 'package.json') &&
            fs.existsSync(this.getProjectPath() + 'app' + path.sep);
    },

    /**
     * Checks if given directory name is existing
     * @param {string} directory
     * @return {boolean}
     */
    hasExistingProject(directory) {
        return fs.existsSync(process.cwd() + path.sep + directory);
    },

    /**
     * Returns path to all jovo model files
     * @return {string}
     */
    getModelsPath: function() {
        return projectPath + path.sep + 'models';
    },

    /**
     * Get path to app i18n folder
     * @return {string}
     */
    getI18nPath: function() {
        return projectPath + path.sep + 'app' + path.sep + 'i18n';
    },

    /**
     * Get path to platforms folder
     * @return {string}
     */
    getPlatformsPath: function() {
        return projectPath + path.sep + 'platforms';
    },


    /**
     * Returns project platform
     * TODO:
     * @return {string}
     */
    getProjectPlatform2: function() {
        return 'alexaSkill';
        // return getProjectSkillId() ? 'alexaSkill' : 'none';
    },


    /**
     * Returns project locale. Takes the first from the
     * models path
     * @param {string} locale
     * @return {string}
     */
    getLocales: function(locale) {
        try {
            if (locale) {
                return [locale];
            }
            if (!fs.existsSync(this.getModelsPath())) {
                return [DEFAULT_LOCALE];
            }
            let files = fs.readdirSync(this.getModelsPath());

            if (files.length === 0) {
                return [DEFAULT_LOCALE];
            }
            let locales = [];
            for (let file of files) {
                if (file.length === 10) {
                    locales.push(file.substr(0, 5));
                }
            }
            return locales;
        } catch (err) {
            throw err;
        }
    },

    /**
     * Returns project platform
     * @return {string}
     */
    getProjectPlatform: function() {
        try {
            let config = this.getConfig();
            let projectPlatform = '';
            if (config.alexaSkill) {
                projectPlatform = PLATFORM_ALEXASKILL;
            }
            if (config.googleAction) {
                projectPlatform = PLATFORM_GOOGLEACTION;
            }

            if (config.alexaSkill && config.googleAction) {
                projectPlatform = PLATFORM_ALL;
            }
            if (projectPlatform.length === 0) {
                projectPlatform = PLATFORM_NONE;
            }
            return projectPlatform;
        } catch (error) {
            // if (error.code === 'ENOENT') {
                return PLATFORM_NONE;
            // }

            // throw error;
        }
    },

    /**
     * Returns project platforms
     * @param {Array<string>} platform
     * @return {*}
     */
    getPlatform: function(platform) {
        let projectPlatforms = [];
        try {
            if (platform) {
                return [platform];
            }
            let config = this.getConfig();
            if (config.alexaSkill) {
                projectPlatforms.push(PLATFORM_ALEXASKILL);
            }
            if (config.googleAction) {
                projectPlatforms.push(PLATFORM_GOOGLEACTION);
            }
        } catch (error) {
            if (this.hasAlexaSkill()) {
                projectPlatforms.push(PLATFORM_ALEXASKILL);
            }
            if (this.hasGoogleActionDialogFlow()) {
                projectPlatforms.push(PLATFORM_GOOGLEACTION);
            }
        }
        return projectPlatforms;
    },

    /**
     * Returns jovo model object
     * @param {string} locale
     * @return {*}
     */
    getModel: function(locale) {
        try {
            return require(this.getModelPath(locale));
        } catch (error) {
            throw error;
        }
    },

    /**
     * Backups model file
     * @param {string} locale
     * @return {Promise<any>}
     */
    backupModel: function(locale) {
        return new Promise((resolve, reject) => {
            let target = this.getModelPath(locale).substr(0, this.getModelPath(locale).length - 5);
            let today = new Date();
            today = today.toISOString().substring(0, 10);
            target = target + today + '.json';
            // copyFile(this.getModelPath(locale), target);
            fs.writeFile(target, JSON.stringify(this.getModel(locale), null, '\t'), function(err) {
                if (err) {
                    reject(err);
                    return;
                }
                resolve();
            });
        });
    },

    /**
     * Saves model to file
     * @param {*} model
     * @param {string} locale
     * @return {Promise<any>}
     */
    saveModel: function(model, locale) {
        return new Promise((resolve, reject) => {
            if (!fs.existsSync(this.getModelsPath())) {
                fs.mkdirSync(this.getModelsPath());
            }

            fs.writeFile(this.getModelPath(locale), JSON.stringify(model, null, '\t'), function(err) {
                if (err) {
                    reject(err);
                    return;
                }
                resolve();
            });
        });
    },

    /**
     * Checks if model files for given locales exist
     * @param {Array<string>} locales
     * @return {boolean}
     */
    hasModelFiles: function(locales) {
        for (let locale of locales) {
            try {
                this.getModel(locale);
                return true;
            } catch (err) {

            }
        }
        return false;
    },

    /**
     * Returns model path for the given locale
     * @param {string} locale
     * @return {string}
     */
    getModelPath: function(locale) {
        // /models/{locale}.json
        return this.getModelsPath() + path.sep + locale + '.json';
    },

    /**
     * Returns path to app.json
     * @return {string}
     */
    getConfigPath: function() {
        return projectPath + path.sep + 'app.json';
    },

    /**
     * Returns app.json object
     * @return {*}
     */
    getConfig: function() {
        try {
            return require(this.getConfigPath());
        } catch (error) {
            throw error;
        }
    },


    /**
     * Returns true if app.json exists
     * @return {boolean}
     */
    hasAppJson: function() {
        try {
            require(this.getConfigPath());
            return true;
        } catch (error) {
            return false;
        }
    },


    /**
     * Returns true if project has alexa skill files
     * @return {boolean}
     */
    hasAlexaSkill: function() {
        try {
            let AlexaSkill = require('./alexaUtil');
            require(AlexaSkill.getSkillJsonPath());
            return true;
        } catch (err) {
            return false;
        }
    },

    /**
     * Returns true if project has Google Action -> DialogFlow files
     * @return {boolean}
     */
    hasGoogleActionDialogFlow: function() {
        try {
            let DialogFlowHelper = require('./dialogflowUtil');
            require(DialogFlowHelper.getAgentJsonPath());
            return true;
        } catch (err) {
            return false;
        }
    },


    /**
     * Extends project's app.json
     * @param {*} object
     * @return {Promise<any>}
     */
    updateConfig: function(object) {
        return new Promise((resolve, reject) => {
            let config;
            try {
                config = this.getConfig();
            } catch (err) {
                config = {};
            }
            _.extend(config, object);

            fs.writeFile(this.getConfigPath(), JSON.stringify(config, null, '\t'), function(err) {
                if (err) {
                    reject(err);
                    return;
                }
                resolve();
            });
        });
    },

    updatePlatformConfig: function(platform) {
        return new Promise((resolve, reject) => {
            let config;
            try {
                config = this.getConfig();
            } catch (err) {
                config = {};
            }

            if (platform === PLATFORM_ALEXASKILL) {
                if (!config.alexaSkill) {
                    _.extend(config, {
                        alexaSkill: {
                            nlu: 'alexa',
                        },
                    });
                }
            } else if (platform === PLATFORM_GOOGLEACTION) {
                if (!config.googleAction) {
                    _.extend(config, {
                        googleAction: {
                            nlu: {
                                name: 'dialogflow',
                                version: 1,
                            },
                        },
                    });
                }
            }
            fs.writeFile(this.getConfigPath(), JSON.stringify(config, null, '\t'), function(err) {
                if (err) {
                    reject(err);
                    return;
                }
                resolve();
            });
        });
    },

    updateModelPlatformDefault: function(platform) {
        return new Promise((resolve, reject) => {
            let p = Promise.resolve();
            for (let locale of this.getLocales()) {
                let model = this.getModel(locale);

                if (platform === PLATFORM_ALEXASKILL) {
                    const AlexaSkill = require('./alexaUtil');
                    if (_.get(model, 'alexa.interactionModel.languageModel.intents')) {
                        let result = _.unionBy(_.get(model, 'alexa.interactionModel.languageModel.intents'), AlexaSkill.getDefaultIntents(), 'name');
                        _.set(model, 'alexa.interactionModel.languageModel.intents', result);
                    } else {
                        _.set(model, 'alexa.interactionModel.languageModel.intents', AlexaSkill.getDefaultIntents());
                    }
                } else if (platform === PLATFORM_GOOGLEACTION) {
                    const DialogFlow = require('./dialogflowUtil');
                    _.set(model, 'dialogflow.intents', DialogFlow.getDefaultIntents());
                }
                p = p.then(() => this.saveModel(model, locale));
            }
            p.then(() => resolve());
        });
    },

    /**
     * Updates invocation for model
     * @param {string} invocation
     * @param {string} locale
     * @return {Promise<any>}
     */
    updateInvocation: function(invocation, locale) {
        return new Promise((resolve, reject) => {
            try {
                let model = this.getModel(locale);
                model.invocation = invocation;
                this.saveModel(model, locale).then(() => resolve());
            } catch (error) {
                reject(error);
            }
        });
    },


    /**
     * Runs npm install
     * @return {Promise<any>}
     */
    runNpmInstall: function() {
        return new Promise((resolve, reject) => {
            exec('npm install', {
                    cwd: this.getProjectPath()}
                ,
                function(error) {
                    if (error) {
                        console.log(error);
                        reject(error);
                        return;
                    }
                    resolve();
                });
        });
    },


    /**
     * Updates model locale file
     * @param {string} locale
     * @return {Promise<any>}
     */
    updateModelLocale: function(locale) {
        return new Promise((resolve, reject) => {
            const modelPath = this.getModelsPath();
            fs.readdir(modelPath, (err, files) => {
                if (err) {
                    reject(err);
                    return;
                }

                let modelFile;
                files.forEach((file) => {
                    if (file !== locale + '.json') {
                        modelFile = file;
                    }
                });

                if (modelFile) {
                    fs.rename(modelPath + path.sep + modelFile, modelPath + path.sep + locale + '.json', function(err) {
                        if ( err ) {
                            return reject(err);
                        } else {
                            resolve();
                        }
                    });
                } else {
                    resolve();
                }
            });
        });
    },

    /**
     * Gets endpoint uri
     * @param {string} endpointType type of end
     * @return {Promise<any>}
     */
    getEndpoint: function(endpointType) {
        return new Promise((resolve, reject) => {
            if (endpointType === ENDPOINT_NGROK) {
                getNgrokUrl(null, (error, url) => {
                    if (error) {
                        return reject(new Error(`I couldn’t find a uri for ngrok.
Please run <ngrok http 3000> in another tab if you want to create an ngrok link.`));
                    }
                    resolve(url + '/webhook');
                });
            } else if (endpointType === ENDPOINT_BSTPROXY) {
                const home = process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME'];
                try {
                    const data = fs.readFileSync(path.join(home, '.bst/config'));
                    const bstConfig = JSON.parse(data.toString());
                    const proxyURL = 'https://' + bstConfig.sourceID + '.bespoken.link/webhook';

                    resolve(proxyURL);
                } catch (err) {
                    reject(err);
                }
            } else if (endpointType === ENDPOINT_JOVOWEBHOOK) {
                let config;
                try {
                    config = this.loadJovoConfig();
                    if (!_.get(config, 'webhook.uuid')) {
                        _.set(config, 'webhook.uuid', uuidv4());
                        this.saveJovoConfig(config);
                    }
                    resolve(JOVO_WEBHOOK_URL + '/' + config.webhook.uuid);
                } catch (error) {
                    config = {};
                    _.set(config, 'webhook.uuid', uuidv4());
                    this.saveJovoConfig(config);
                    resolve(JOVO_WEBHOOK_URL + '/' + config.webhook.uuid);
                }
            }
        });
    },


    /**
     * Updates endpont to app.json
     * @param {string} endpointType
     * @return {Promise<T>}
     */
    updateEndpoint: function(endpointType) {
        if (!endpointType) {
            return Promise.resolve();
        }
        return this.getEndpoint(endpointType).then((uri) => this.updateConfig({endpoint: uri}));
    },

    /**
     * Creates empty project
     * Downloads template
     * Extracts template
     * @param {string} projectName
     * @param {string} template
     * @param {string} locale
     * @return {*}
     */
    createEmptyProject: function(projectName, template, locale) {
        return new Promise((resolve) => {
            if (!fs.existsSync(projectPath)) {
                fs.mkdirSync(projectPath);
            }
            resolve(projectName, template, locale);
        });
    },

    downloadAndExtract: function(projectName, template, locale) {
          return this.downloadTemplate(projectName, template, locale)
                .then((pathToZip) => this.unzip(pathToZip, projectName));
    },

    /**
     * Downloads prepared template from jovo sample apps repo
     * @param {string} projectPath
     * @param {string} template
     * @param {string} locale
     * @return {Promise<any>}
     */
    downloadTemplate: function(projectPath, template, locale) {
        return new Promise((resolve, reject) => {
            let templateName = template + '_' + locale + '.zip';
            let url = REPO_URL + templateName;
            if (!fs.existsSync(projectPath)) {
                fs.mkdirSync(projectPath);
            }

            request(url)
                .on('response', function(res) {
                    if (res.statusCode === 200) {
                        res.pipe(fs.createWriteStream(projectPath + path.sep + templateName))
                        .on( 'close', function() {
                            resolve(projectPath + path.sep + templateName);
                        });
                    } else if (res.statusCode === 404) {
                        reject(new Error('Could not find template.'));
                    } else {
                        reject(new Error('Could not download template.'));
                    }
                });
        });
    },

    /**
     * Extracts template to project folder
     * @param {string} pathToZip
     * @param {string} pathToFolder
     * @return {Promise<any>}
     */
    unzip: function(pathToZip, pathToFolder) {
        return new Promise((resolve, reject) => {
            try {
                let zip = new AdmZip(pathToZip);
                zip.extractAllTo(pathToFolder, true);
                fs.unlinkSync(pathToZip);
                resolve(pathToFolder);
            } catch (err) {
                reject(err);
            }
        });
    },

    loadJovoConfig: function() {
        try {
            const data = fs.readFileSync(path.join(this.getUserHome(), '.jovo/config'));
            return JSON.parse(data.toString());
        } catch (err) {

        }
    },

    saveJovoConfig: function(config) {
        if (!fs.existsSync(this.getUserHome() + path.sep + '.jovo')) {
            fs.mkdirSync(this.getUserHome() + path.sep + '.jovo');
        }
        fs.writeFileSync(path.join(this.getUserHome(), '.jovo/config'), JSON.stringify(config, null, '\t'));
    },

    getWebhookUuid() {
        try {
            return this.loadJovoConfig().webhook.uuid;
        } catch (error) {
            throw error;
        }
    },

    getUserHome: function() {
        return process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME'];
    },

    /**
     * Validates jovo model
     * @param {*} locale
     */
    validateModel(locale) {
        let model;
        try {
            model = this.getModel(locale);
        } catch (error) {
            if (error.code === 'MODULE_NOT_FOUND') {
                throw new Error('Could not find model file for locale "' + locale + '"');
            }
            throw error;
        }

        for (let intent of model.intents) {
            if (!intent.name) {
                throw new Error(`Intents must have "name"`);
            }
            if (!_.isString(intent.name)) {
                throw new Error(`"name" must be type of string`);
            }
            if (!intent.phrases) {
                throw new Error(`Intents must have "phrases"`);
            }
            if (!_.isArray(intent.phrases)) {
                throw new Error(`"phrases" must be type of array`);
            }

            for (let phrase of intent.phrases) {
                let re = /{(.*?)}/g;
                let m;
                while (m = re.exec(phrase)) {
                    if (!intent.inputs) {
                        if (!_.isArray(intent.inputs)) {
                            throw new Error(`${m[1]} has to be defined in inputs array`);
                        }
                    }
                    let inputs = intent.inputs.filter((item) => {
                        if (!item.name) {
                           throw new Error(`Input in intent ${intent.name} must have "name"`);
                        }
                        if (!_.isString(item.name)) {
                            throw new Error(`Input name in intent ${intent.name} must of type string`); // eslint-disable-line
                        }
                        if (!item.type) {
                            throw new Error(`Input in intent ${intent.name} must have "type"`);
                        }
                        if (_.isObject(item.type)) {
                            if (!item.type.alexa && !item.type.dialogflow) {
                                throw new Error(`Add alexa or/and dialogflow to input ${item.name}`); // eslint-disable-line
                            }
                        }

                        return item.name === m[1];
                    });
                    if (inputs.length === 0) {
                        throw new Error(`Intent ${intent.name}: 
                        Every parameter in curly brackets has to be in the slots array.`);
                    }
                }
            }
        }
        if (model.alexa) {
            if (Object.keys(model.alexa).length !== 1) {
                throw new Error(`alexa must have only one object (interactionModel)`);
            }
            if (!model.alexa.interactionModel) {
                throw new Error(`alexa must have interactionModel object`);
            }
        }

        if (model.inputTypes) {
            if (!_.isArray(model.inputTypes)) {
                throw new Error('inputTypes must be of type array');
            }
            for (let inputType of model.inputTypes) {
                if (!inputType.name) {
                    throw new Error(`Input types must have "name"`);
                }
                if (!_.isString(inputType.name)) {
                    throw new Error(`"name" must be type of string`);
                }
                if (!inputType.values) {
                    throw new Error(`Input types must have "values"`);
                }
                if (!_.isArray(inputType.values)) {
                    throw new Error(`"values" must be type of array`);
                }
                for (let value of inputType.values) {
                    if (!value.value) {
                        throw new Error(`Input "${inputType.name}" values must have object with value`); // eslint-disable-line
                    }
                    if (!_.isString(value.value)) {
                        throw new Error(`"value" must be type of string`);
                    }
                    if (value.synonyms) {
                        if (!_.isArray(value.synonyms)) {
                            throw new Error(`"synonyms" must be type of array`);
                        }
                        for (let synonym of value.synonyms) {
                            if (!_.isString(synonym)) {
                                throw new Error(`"synonym" must be type of string`);
                            }
                        }
                    }
                }
            }
        }
    },

};


/**
 * Looks for a running ngrok instance und returns
 * the public secured url
 * @param {Number} port
 * @param {func} callback
 */
function getNgrokUrl(port, callback) {
    const options = {
        url: 'http://localhost:4040/api/tunnels',
        headers: {
            accept: 'application/json',
        },
    };

    let webhookPort = port ? port : 3000;
    request(options, function(error, response, body) {
        if (error) {
            callback(error);
            return;
        }

        let result = JSON.parse(body);
        for (let i = 0; i < result.tunnels.length; i++) {
            let tunnel = result.tunnels[i];
            if (tunnel.proto === 'https' && tunnel.config.addr === 'localhost:'+webhookPort) {
                callback(null, result.tunnels[i].public_url);
            }
        }
    });
}


/**
 * Copy file
 * @param {string} source
 * @param {string} target
 * @return {Promise<any>}
 */
function copyFile(source, target) {
    let rd = fs.createReadStream(source);
    let wr = fs.createWriteStream(target);
    return new Promise(function(resolve, reject) {
        rd.on('error', reject);
        wr.on('error', reject);
        wr.on('finish', resolve);
        rd.pipe(wr);
    }).catch(function(error) {
        rd.destroy();
        wr.end();
        throw error;
    });
}


module.exports.DEFAULT_LOCALE = DEFAULT_LOCALE;
module.exports.DEFAULT_PLATFORM = DEFAULT_PLATFORM;
module.exports.DEFAULT_TEMPLATE = DEFAULT_TEMPLATE;
module.exports.DEFAULT_TARGET = DEFAULT_TARGET;
module.exports.DEFAULT_ASK_PROFILE = DEFAULT_ASK_PROFILE;
module.exports.PLATFORM_NONE = PLATFORM_NONE;
module.exports.PLATFORM_ALEXASKILL = PLATFORM_ALEXASKILL;
module.exports.PLATFORM_GOOGLEACTION = PLATFORM_GOOGLEACTION;
module.exports.PLATFORM_ALL = PLATFORM_ALL;
module.exports.TARGET_ALL = TARGET_ALL;
module.exports.TARGET_INFO = TARGET_INFO;
module.exports.TARGET_MODEL = TARGET_MODEL;
module.exports.TARGET_LAMBDA = TARGET_LAMBDA;

module.exports.ENDPOINT_NGROK = ENDPOINT_NGROK;
module.exports.ENDPOINT_BSTPROXY = ENDPOINT_BSTPROXY;
module.exports.ENDPOINT_JOVOWEBHOOK = ENDPOINT_JOVOWEBHOOK;
module.exports.ENDPOINT_NONE = ENDPOINT_NONE;


module.exports.DEFAULT_ENDPOINT = DEFAULT_ENDPOINT;

module.exports.JOVO_WEBHOOK_URL = JOVO_WEBHOOK_URL;


