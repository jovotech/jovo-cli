'use strict';
const Helper = require('./lmHelper');
const fs = require('fs-extra');
const path = require('path');
const archiver = require('archiver');
const _ = require('lodash');


module.exports = {

    /**
     * Returns base path to Alexa Skill
     * @return {string}
     */
    getPath: function() {
        return require('./googleActionUtil').getPath() + path.sep + 'dialogflow';
    },

    /**
     * Returns path to intents folder
     * @return {string}
     */
    getIntentsFolderPath: function() {
        return this.getPath() + path.sep + 'intents' + path.sep;
    },

    /**
     * Returns path to entities folder
     * @return {string}
     */
    getEntitiesFolderPath: function() {
        return this.getPath() + path.sep + 'entities' + path.sep;
    },


    /**
     * Returns path to DialogFlow package.json
     * @return {string}
     */
    getPackageJsonPath: function() {
        return this.getPath() + path.sep + 'package.json';
    },

    /**
     * package.json as object
     * @return {*}
     */
    getPackageJson: function() {
        return require(this.getPackageJsonPath());
    },

    /**
     * Path to agent.json
     * @return {string}
     */
    getAgentJsonPath: function() {
        return this.getPath() + path.sep + 'agent.json';
    },

    /**
     * agent.json as object
     * @return {*}
     */
    getAgentJson: function() {
        try {
            return require(this.getAgentJsonPath());
        } catch (error) {
            throw error;
        }
    },

    /**
     * Creates basic agent.json object
     * @param {Array<string>} locales
     * @return {*} object
     */
    createEmptyAgentJson: function(locales) {
        let agentJson = {
            description: '',
            language: Helper.DEFAULT_LOCALE.substr(0, 2),
            supportedLanguages: [],
        };

        for (let locale of locales) {
            agentJson.supportedLanguages.push(locale.toLowerCase());
        }

        if (locales.length === 1) {
            agentJson.language = locales[0].substr(0, 2);
        }


        return agentJson;
    },

    /**
     * Builds agent.json from app.json
     * @param {*} ctx
     * @return {Promise<any>}
     */
    buildDialogFlowAgent: function(ctx) {
        return new Promise((resolve, reject) => {
            try {
                let config = Helper.Project.getConfig();

                let agent;

                try {
                    agent = this.getAgentJson();
                } catch (err) {
                    agent = this.createEmptyAgentJson(ctx.locales);
                }

                // endpoint
                if (_.get(config, 'endpoint')) {
                    // create basic https endpoint from wildcard ssl
                    if (_.isString(_.get(config, 'endpoint'))) {
                        _.set(agent, 'webhook', {
                            url: _.get(config, 'endpoint'),
                            available: true,
                        });
                    } else if (_.isObject(_.get(config, 'endpoint')) && _.get(config, 'endpoint.googleAction.dialogFlow')) {
                        // get full object
                        _.set(agent, 'webhook', _.get(config, 'endpoint'));
                    }
                }

                if (_.get(config, 'googleAction.dialogflow.agent')) {
                    _.merge(agent, config.googleAction.dialogflow.agent);
                }

                agent.supportedLanguages = [];
                for (let locale of ctx.locales) {
                    agent.supportedLanguages.push(locale.toLowerCase());
                }

                fs.writeFile(this.getAgentJsonPath(), JSON.stringify(agent, null, '\t'), function(err) {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve();
                });
            } catch (err) {
                reject(err);
            }
        });
    },

    /**
     * Builds Dialog Flow language model files from Jovo model
     * @param {string} locale
     * @return {Promise<any>}
     */
    buildLanguageModelDialogFlow: function(locale) {
        return new Promise((resolve, reject) => {
            try {
                const DialogFlowAgent = require('./dialogFlowAgent').DialogFlowAgent;
                let dfa = new DialogFlowAgent({locale: locale});
                dfa.transform(Helper.Project.getModel(locale));
                resolve();
            } catch (err) {
                reject(err);
            }
        });
    },

    /**
     * Archives Dialog Flow agent + models files
     * @return {Promise<any>}
     */
    zip: function() {
        return new Promise((resolve, reject) => {
            let zipPath = require('./googleActionUtil').getPath() + path.sep + 'dialogflow_agent.zip';
            let output = fs.createWriteStream(zipPath);
            let archive = archiver('zip', {
                zlib: {level: 9}, // Sets the compression level.
            });

            output.on('close', function() {
            });

            output.on('end', function() {
            });

            archive.on('warning', function(err) {
                if (err.code === 'ENOENT') {
                    // log warning
                } else {
                    // throw error
                    throw err;
                }
            });

            archive.on('error', function(err) {
                reject(err);
            });
            archive.pipe(output);
            let file1 = this.getPath() + path.sep + 'package.json';
            archive.append(fs.createReadStream(file1), {name: 'package.json'});
            archive.directory(this.getIntentsFolderPath(), 'intents');
            if (fs.existsSync(this.getEntitiesFolderPath())) {
                archive.directory(this.getEntitiesFolderPath(), 'entities');
            }
            archive.finalize();
            resolve(zipPath);
        });
    },
};
