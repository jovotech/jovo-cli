'use strict';
const exec = require('child_process').exec;
const Helper = require('./lmHelper');
const AlexaInteractionModel = require('./alexaInteractionModel').AlexaInteractionModel;
const _ = require('lodash');
const fs = require('fs-extra');
const path = require('path');
const archiver = require('archiver');
const AWS = require('aws-sdk');
module.exports = {

    /**
     * Returns base path to Alexa Skill
     * @return {string}
     */
    getPath: function() {
        return Helper.Project.getProjectPath() + 'platforms' + path.sep + 'alexaSkill';
    },


    /**
     * Returns path to Alexa model files
     * @return {string}
     */
    getModelsPath: function() {
        return this.getPath() + path.sep + 'models';
    },

    /**
     * Returns path to Alexa Model file
     * @param {string} locale
     * @return {string}
     */
    getModelPath: function(locale) {
        return this.getModelsPath() + path.sep + locale + '.json';
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
                if (_.isArray(locale)) {
                    return locale;
                } else {
                    return [locale];
                }
            }
            let files = fs.readdirSync(this.getModelsPath());

            if (files.length === 0) {
                return [Helper.DEFAULT_LOCALE];
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
     * Returns path to AlexaSkill account linking json
     * @return {string}
     */
    getAccountLinkingPath: function() {
        return this.getPath() + path.sep + 'accountLinking.json';
    },

    /**
     * Returns project skill id extracted from
     * Alexa Skill config
     * @return {string}
     */
    getSkillId: function() {
        try {
            let skillId = _.get(this.getAskConfig(), 'deploy_settings.default.skill_id');
            if (skillId && skillId.length > 0) {
                return skillId;
            }
        } catch (err) {
            throw err;
        }
    },

    /**
     * Returns path to skill.json
     * @return {string}
     */
    getSkillJsonPath: function() {
        return this.getPath() + path.sep + 'skill.json';
    },

    /**
     * Returns path to .ask/
     * @return {string}
     */
    getAskConfigFolderPath: function() {
        return this.getPath() + path.sep + '.ask';
    },

    /**
     * Returns path to .ask/config file
     * @return {string}
     */
    getAskConfigPath: function() {
        return this.getAskConfigFolderPath() + path.sep + 'config';
    },

    /**
     * Returns skill.json object
     * @return {*}
     */
    getSkillJson: function() {
        try {
            return require(this.getSkillJsonPath());
        } catch (error) {
            throw error;
        }
    },

    /**
     * Returns .ask/config object
     * @return {any}
     */
    getAskConfig: function() {
        try {
            return JSON.parse(fs.readFileSync(this.getAskConfigPath(), 'utf8'));
        } catch (error) {
            throw error;
        }
    },

    /**
     * Returns Alexa model object
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
     * Creates empty skill.json
     * @param {string} skillName
     * @param {Array<string>} locales
     * @return {*}
     */
    createEmptySkillJson: function(skillName, locales) {
        let skillJson = {
            'manifest': {
                'publishingInformation': {
                    'locales': {
                    },
                    'isAvailableWorldwide': true,
                    'testingInstructions': 'Sample Testing Instructions.',
                    'category': 'EDUCATION_AND_REFERENCE',
                    'distributionCountries': [],
                },
                'apis': {

                },
                'manifestVersion': '1.0',
            },
        };

        for (let locale of locales) {
            if (locale.length === 2) {
                try {
                    let appJson = Helper.Project.getConfig();

                    if (!_.get(appJson, `alexaSkill.nlu.lang.${locale}`)) {
                        throw new Error();
                    }
                    let sublocales = _.get(appJson, `alexaSkill.nlu.lang.${locale}`);

                    for (let sublocale of sublocales) {
                        _.set(skillJson, `manifest.publishingInformation.locales.${sublocale}`, {
                            'summary': 'Sample Short Description',
                            'examplePhrases': [
                                'Alexa open hello world',
                            ],
                            'name': skillName,
                            'description': 'Sample Full Description',
                        });
                    }
                } catch (error) {
                    throw new Error('Could not retrieve locales mapping for language ' + locale);
                }
            } else {
                _.set(skillJson, `manifest.publishingInformation.locales.${locale}`, {
                    'summary': 'Sample Short Description',
                    'examplePhrases': [
                        'Alexa open hello world',
                    ],
                    'name': skillName,
                    'description': 'Sample Full Description',
                });
            }
        }

        return skillJson;
    },

    /**
     * Creates empty model object
     * @return {*}
     */
    createEmptyModelJson: function() {
        return {
            'interactionModel': {
                'languageModel': {},
            },
        };
    },


    /**
     * Creates empty skill project files
     * @param {*} config
     * @return {Promise<any>}
     */
    createAlexaSkill: function(config) {
        return new Promise((resolve, reject) => {
            let alexaSkillPath = this.getPath();

            if (!fs.existsSync(alexaSkillPath)) {
                fs.mkdirSync(alexaSkillPath);
            }

            let alexaModelPath = this.getModelsPath();
            if (!fs.existsSync(alexaModelPath)) {
                fs.mkdirSync(alexaModelPath);
            }

            let askConfigPath = this.getAskConfigFolderPath();
            if (!fs.existsSync(askConfigPath)) {
                fs.mkdirSync(askConfigPath);
            }

            let skillJson = this.createEmptySkillJson(
                Helper.Project.getProjectName(),
                config.locales
            );

            let self = this;

            _.set(skillJson, 'manifest.apis.custom', {});

            fs.writeFile(self.getSkillJsonPath(), JSON.stringify(skillJson, null, '\t'), function(err) {
                if (err) {
                    reject(err);
                    return;
                }
                let askConfig = {
                    deploy_settings: {
                        default: {
                            skill_id: '',
                            was_cloned: false,
                        },
                    },
                };
                fs.writeFile(self.getAskConfigPath(), JSON.stringify(askConfig, null, '\t'), function(err) {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve();
                });
            });
        });
    },

    /**
     * Builds and saves Alexa Skill model from jovo model
     * @param {string} locale
     * @param {string} stage
     * @return {Promise<any>}
     */
    buildLanguageModelAlexa: function(locale, stage) {
        return new Promise((resolve, reject) => {
            try {
                let alexaModel;
                try {
                    alexaModel = this.getModel(locale);
                } catch (err) {
                    alexaModel = this.createEmptyModelJson();
                }
                let aim = new AlexaInteractionModel(alexaModel);
                aim.transform(locale, stage);
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    },

    /**
     * Builds and saves Alexa Skill model from jovo model
     * @param {string} stage
     * @return {Promise<any>}
     */
    buildSkillAlexa: function(stage) {
        return new Promise((resolve, reject) => {
            try {
                let config = Helper.Project.getConfig(stage);
                let skillJson = this.getSkillJson();
                // endpoint
                if (_.get(config, 'endpoint')) {
                    // create basic https endpoint from wildcard ssl
                    if (_.isString(_.get(config, 'endpoint'))) {
                        _.set(skillJson, 'manifest.apis.custom.endpoint', {
                                sslCertificateType: 'Wildcard',
                                uri: Helper.Project.getEndpointFromConfig(_.get(config, 'endpoint')),
                        });
                    } else if (_.isObject(_.get(config, 'endpoint')) && _.get(config, 'endpoint.alexaSkill')) {
                        // get full object
                        _.set(skillJson, 'manifest.apis.custom.endpoint',
                            Helper.Project.getEndpointFromConfig(_.get(config, 'endpoint.alexaSkill'))
                        );
                    }
                } else {
                    let globalConfig = Helper.Project.getConfig();
                    let stageConfig = _.get(Helper.Project.getConfig(), `stages.${stage}`);
                    let arn = _.get(stageConfig, 'alexaSkill.endpoint') ||
                        _.get(globalConfig, 'alexaSkill.endpoint');

                    if (!arn) {
                        arn = _.get(stageConfig, 'alexaSkill.host.lambda.arn') ||
                            _.get(stageConfig, 'host.lambda.arn') ||
                            _.get(globalConfig, 'alexaSkill.host.lambda.arn') ||
                            _.get(globalConfig, 'host.lambda.arn');
                    }

                    if (arn) {
                        if (_.startsWith(arn, 'arn')) {
                            _.set(skillJson, 'manifest.apis.custom.endpoint', {
                                    uri: arn,
                            });
                        } else {
                            _.set(skillJson, 'manifest.apis.custom.endpoint', {
                                    sslCertificateType: 'Wildcard',
                                    uri: arn,
                            });
                        }
                    }
                }
                if (_.get(config, 'alexaSkill.manifest')) {
                    _.merge(skillJson.manifest, config.alexaSkill.manifest);
                }

                fs.writeFile(this.getSkillJsonPath(), JSON.stringify(skillJson, null, '\t'), (err) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    if (typeof Helper.Project.getConfigParameter('alexaSkill.skillId', stage) !== 'undefined') {
                        this.setAlexaSkillId(Helper.Project.getConfigParameter('alexaSkill.skillId', stage))
                            .then(() => resolve());
                    } else {
                        resolve();
                    }
                });
            } catch (err) {
                return reject(err);
            }
        });
    },

    /**
     * Returns skill id promise
     * @return {Promise<any>}
     */
    getSkillIdPromise: function() {
        return new Promise((resolve) => {
            fs.readFile(this.getAskConfigPath(), 'utf-8', (err, data) => {
                if (err) {
                    resolve();
                    return;
                }
                resolve(_.get(JSON.parse(data), 'deploy_settings.default.skill_id'));
            });
        });
    },

    /**
     * Returns skill information
     * @return {*}
     */
    getSkillInformation: function() {
        let info = {
            name: '',
            invocationName: '',
        };

        let skillJson = this.getSkillJson();
        let locales = skillJson.manifest.publishingInformation.locales;
        for (let locale of Object.keys(locales)) {
            info.name += locales[locale].name + ' (' +locale+ ') ';
            info.invocationName += this.getInvocationName(locale) + ' ('+locale+') ';
        }
        info.skillId = this.getSkillId();
        info.endpoint = skillJson.manifest.apis.custom.endpoint.uri;
        return info;
    },

    /**
     * Returns simple skill information
     * @return {*}
     */
    getSkillSimpleInformation: function() {
        let info = {
            name: '',
        };

        let skillJson = this.getSkillJson();
        let locales = skillJson.manifest.publishingInformation.locales;
        for (let locale of Object.keys(locales)) {
            info.name += locales[locale].name + ' (' +locale+ ') ';
        }
        info.skillId = this.getSkillId();
        info.endpoint = _.get(skillJson, 'manifest.apis.custom.endpoint.uri', '');
        return info;
    },

    /**
     * Returns true if endpoint is a lambda function arn
     * @return {boolean}
     */
    isLambdaEndpoint() {
        let skillJson = this.getSkillJson();
        return _.startsWith(skillJson.manifest.apis.custom.endpoint.uri, 'arn');
    },

    /**
     * Returns invocationName for given locale
     * @param {string} locale
     * @return {{}|interactionModel.languageModel}
     */
    getInvocationName: function(locale) {
        return this.getModel(locale).interactionModel.languageModel.invocationName;
    },

    /**
     * Default Alexa Intents
     * @return {Array<*>}
     */
    getDefaultIntents: function() {
        return [
            {
                'name': 'AMAZON.CancelIntent',
                'samples': [

                ],
            },
            {
                'name': 'AMAZON.HelpIntent',
                'samples': [

                ],
            },
            {
                'name': 'AMAZON.StopIntent',
                'samples': [

                ],
            },
        ];
    },

    /**
     * Saves Skill ID to .ask/config
     * @param {string} skillId
     * @return {Promise<any>}
     */
    setAlexaSkillId: function(skillId) {
        let self = this;
        return new Promise((resolve, reject) => {
            if (!fs.existsSync(self.getAskConfigFolderPath())) {
                fs.mkdirSync(self.getAskConfigFolderPath());
            }

            fs.readFile(self.getAskConfigPath(), 'utf-8', function(err, data) {
                let askConfig;
                if (err) {
                    if (err.code === 'ENOENT') {
                        askConfig = {
                            deploy_settings: {
                                default: {
                                    skill_id: skillId,
                                    was_cloned: false,
                                },
                            },
                        };
                    }
                } else {
                    askConfig = JSON.parse(data);
                }
                _.set(askConfig, 'deploy_settings.default.skill_id', skillId);
                fs.writeFile(self.getAskConfigPath(), JSON.stringify(askConfig, null, '\t'), function(err) {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve(skillId);
                });
            });
        });
    },

};


module.exports.Ask = {

    /**
     * Checks if ask cli is installed
     * @return {Promise<any>}
     */
    checkAsk: function() {
        return new Promise((resolve, reject) => {
            exec('ask -v', (error, stdout) => {
                if (error) {
                    let msg = 'Jovo requires ASK CLI\n' +
                        'Please read more: https://developer.amazon.com/docs/smapi/quick-start-alexa-skills-kit-command-line-interface.html';
                    return reject(new Error(msg));
                }
                const version = stdout.split('.');
                if (parseInt(version[0]) >= 1 && parseInt(version[1]) >= 1) {
                    return resolve();
                }
                return reject(new Error('Please update ask-cli to version >= 1.1.0'));
            });
        });
    },

    /**
     * Creates skill in ASK
     * @param {*} config
     * @param {string} skillJsonPath
     * @return {Promise<any>}
     */
    askApiCreateSkill: function(config, skillJsonPath) {
        let self = this;
        return new Promise((resolve, reject) => {
            exec('ask api create-skill -f "' + skillJsonPath + '" --profile ' + config.askProfile, (error, stdout, stderr) => {
                if (error) {
                    if (stderr) {
                        return reject(self.getAskError('askApiCreateSkill', stderr));
                    }
                }
                let skillId = stdout.substr(stdout.indexOf('Skill ID: ') + 'Skill ID: '.length, 52).trim();
                resolve(skillId);
            });
        });
    },

    /**
     * Returns list of skills that are owned by the given profile
     * @param {*} config
     * @return {Promise<any>}
     */
    askApiListSkills: function(config) {
        let self = this;
        return new Promise((resolve, reject) => {
            exec('ask api list-skills --profile ' + config.askProfile, {
            }, function(error, stdout, stderr ) {
                if (error) {
                    if (stderr) {
                        return reject(self.getAskError('askApiListSkills', stderr));
                    }
                }
                resolve(JSON.parse(stdout));
            });
        });
    },

    /**
     * Updates model of skill for the given locale
     * @param {*} config
     * @param {*} modelPath
     * @param {string} locale
     * @return {Promise<any>}
     */
    askApiUpdateModel: function(config, modelPath, locale) {
        let self = this;
        return new Promise((resolve, reject) => {
            exec('ask api update-model -s ' + config.skillId + ' -f "' + modelPath + '" -l '+ locale + ' --profile ' + config.askProfile, {
            }, function(error, stdout, stderr ) {
                if (error) {
                    if (stderr) {
                        return reject(self.getAskError('askApiUpdateModel', stderr));
                    }
                }
                resolve();
            });
        });
    },

    /**
     * Updates skill information
     * @param {*} config
     * @param {string} skillJsonPath
     * @return {Promise<any>}
     */
    askApiUpdateSkill: function(config, skillJsonPath) {
        let self = this;
        return new Promise((resolve, reject) => {
            exec('ask api update-skill -s ' + config.skillId + ' -f "' + skillJsonPath + '" --profile ' + config.askProfile, {
            }, function(error, stdout, stderr ) {
                if (error) {
                    if (stderr) {
                        return reject(self.getAskError('askApiUpdateSkill', stderr));
                    }
                }
                resolve();
            });
        });
    },

    /**
     * Gets build status of model
     * @param {*} config
     * @return {Promise<any>}
     */
    askApiGetSkillStatus: function(config) {
        let self = this;
        return new Promise((resolve, reject) => {
            let command = 'ask api get-skill-status -s ' + config.skillId + ' --profile ' + config.askProfile;
            exec(command, {
            }, function(error, stdout, stderr) {
                if (error) {
                    if (stderr) {
                        return reject(self.getAskError('askApiGetSkillStatus', stderr));
                    }
                }
                try {
                    resolve(JSON.parse(stdout));
                } catch (error) {
                    reject(error);
                }
            });
        });
    },


    /**
     * Saves skill information to json file
     * @param {*} config
     * @param {string} skillJsonPath
     * @return {Promise<any>}
     */
    askApiGetSkill: function(config, skillJsonPath) {
        let self = this;
        return new Promise((resolve, reject) => {
            exec('ask api get-skill -s ' + config.skillId + ' > "' + skillJsonPath + '" --profile ' + config.askProfile, (error, stdout, stderr) => {
                if (error) {
                    if (stderr) {
                        return reject(self.getAskError('askApiGetSkill', stderr));
                    }
                }
                resolve();
            });
        });
    },

    /**
     * Saves model to file
     * @param {*} config
     * @param {string} skillJsonPath
     * @param {string} locale
     * @return {Promise<any>}
     */
    askApiGetModel: function(config, skillJsonPath, locale) {
        let self = this;
        return new Promise((resolve, reject) => {
            exec('ask api get-model -s ' + config.skillId + ' -l ' + locale + ' > "' + skillJsonPath + '" --profile ' + config.askProfile, {
            }, function(error, stdout, stderr ) {
                if (error) {
                    if (stderr) {
                        return reject(self.getAskError('askApiGetModel', stderr));
                    }
                }
                resolve();
            });
        });
    },

    /**
     * Saves model to file
     * @param {*} config
     * @return {Promise<any>}
     */
    askApiEnableSkill: function(config) {
        let self = this;
        return new Promise((resolve, reject) => {
            exec('ask api enable-skill -s ' + config.skillId + ' --profile ' + config.askProfile, {
            }, function(error, stdout, stderr ) {
                if (error) {
                    if (stderr) {
                        return reject(self.getAskError('askApiEnableSkill', stderr));
                    }
                }
                resolve();
            });
        });
    },

    /**
     * TODO: saving
     * Saves account linking information to file
     * @param {*} config
     * @return {Promise<any>}
     */
    askApiGetAccountLinking: function(config) {
        let self = this;
        return new Promise((resolve, reject) => {
            exec('ask api get-account-linking -s ' + config.skillId + ' --profile ' + config.askProfile, {
            }, function(error, stdout, stderr ) {
                if (error) {
                    if (stderr && stderr.indexOf('AccountLinking is not present for given skillId') > 0) {
                        resolve();
                    } else if (stderr) {
                        return reject(self.getAskError('askApiGetAccountLinking', stderr));
                    }
                }
                resolve(stdout);
            });
        });
    },

    /**
     * Saves account linking information to file
     * @deprecated
     * @param {*} config
     * @return {Promise<any>}
     */
    askLambdaUpload: function(config) {
        let self = this;
        config.src = config.src.replace(/\\/g, '\\\\');
        return new Promise((resolve, reject) => {
            exec(`ask lambda upload -f ${config.lambdaArn} -s "${config.src}" -p ${config.askProfile}`, {
            }, function(error, stdout, stderr ) {
                if (error || stderr) {
                    if (stderr) {
                        return reject(self.getAskError('askLambdaUpload', stderr));
                    }
                }
                console.log(stdout);
                resolve(stdout);
            });
        });
    },

    /**
     * Returns ask error object
     * @param {string} method
     * @param {*} stderr
     * @return {Error}
     */
    getAskError: function(method, stderr) {
        let badRequest = 'Error code:';
        stderr = stderr.replace(/[\x00-\x1F\x7F-\x9F]/u, '');
        if (stderr.indexOf(badRequest) > -1) {
            try {
                let json = stderr.substring(stderr.indexOf(badRequest) + badRequest.length + 4);

                const parsedMessage = JSON.parse(json);

                let customError = parsedMessage.message;

                if (parsedMessage.violations) {
                    parsedMessage.violations.forEach((violation) => {
                        customError += `\n  ${violation.message}`;
                    });
                }


                return new Error(method + ':' + customError);
            } catch (error) {
                return new Error(method + stderr);
            }
        }
        return new Error('bla');
    },
};

module.exports.AWS = {
    awsLambdaUpload: function(config) {
        config.src = config.src.replace(/\\/g, '\\\\');
        return new Promise((resolve, reject) => {
            let awsProfile = 'default';

            if (config.askProfile) {
                awsProfile = this.getAWSCredentialsFromAskProfile(config.askProfile);
            }

            if (config.awsProfile) {
                awsProfile = config.awsProfile;
            }

            AWS.config.credentials = new AWS.SharedIniFileCredentials({profile: awsProfile});

            let region = config.lambdaArn.match(/([a-z]{2})-([a-z]{4})([a-z]*)-\d{1}/g);
            AWS.config.region = region[0];

            const lambda = new AWS.Lambda(config.awsConfig || {});
            let pathToZip = config.src + '/lambdaUpload.zip';
            return this.zipSrcFolder(pathToZip, config.src).then(() => {
                return this.lambdaUpdateFunction(
                    lambda,
                    pathToZip,
                    config.lambdaArn,
                    config.lambdaConfig || {}
                    );
            }).then((data) => {
                return this.deleteLambdaZip(pathToZip);
            }).then(() => {
                resolve();
            }).catch((err) => {
                reject(err);
            });
        });
    },

    lambdaUpdateFunction(lambda, pathToZip, lambdaArn, lambdaParams) {
        return new Promise((resolve, reject) => {
            let zipdata = fs.readFileSync(pathToZip);

            let params = {
                FunctionName: lambdaArn,
                ZipFile: new Buffer(zipdata),
            };

            params = _.merge(params, lambdaParams);

            lambda.updateFunctionCode(params, function(err, data) {
                if (err) {
                    reject(err);
                } else {
                    resolve(data);
                }
            });
        });
    },

    deleteLambdaZip(pathToZip) {
        return new Promise((resolve, reject) => {
            fs.unlink(pathToZip, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    },
    zipSrcFolder(pathToZip, src) {
        return new Promise((resolve, reject) => {
            const output = fs.createWriteStream(pathToZip);
            const archive = archiver('zip', {
                zlib: {
                    level: 9,
                },
            });

            output.on('close', function() {
                resolve(pathToZip);
            });

            archive.on('error', function(err) {
                reject(err);
            });

            archive.pipe(output);
            // append files from a glob pattern
            archive.glob('**/*', {
                cwd: src,
                ignore: 'lambdaUpload.zip',
            });

            archive.finalize();
        });
    },

    getAWSCredentialsFromAskProfile: function(askProfile) {
        let askCliConfig = path.join(getUserHome(), '.ask', 'cli_config');
        try {
            let data = fs.readFileSync(askCliConfig);
            let askProfiles = JSON.parse(data).profiles;

            for (const profileKey of Object.keys(askProfiles)) {
                let profile = askProfiles[profileKey];
                if (profileKey === askProfile && _.get(profile, 'aws_profile')) {
                    return _.get(profile, 'aws_profile');
                }
            }
        } catch (e) {
            throw e;
        }

    },
};

function getUserHome() {
    return process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME'];
}

module.exports.AlexaInteractionModel = require('./alexaInteractionModel').AlexaInteractionModel;

