'use strict';

const Helper = require('../helper/lmHelper');
const AlexaHelper = require('../helper/alexaUtil');
const DialogFlowHelper = require('../helper/dialogflowUtil');
const GoogleActionUtil = require('../helper/googleActionUtil');
const highlight = require('chalk').white.bold;

const fs = require('fs');
const Listr = require('listr');
const _ = require('lodash');
const pathSep = require('path').sep;
const Prompts = require('./../utils/prompts');
module.exports.newTask = function(ctx) {

};

module.exports.initTask = function() {
    let appJsonText = `Creating /app.json`;
    if (Helper.Project.hasAppJson()) {
        appJsonText = `Updating /app.json`;
    }

    return {
        title: appJsonText,
        task: (ctx, task) => {
            return new Listr([
                {
                    title: `Adding ${highlight(ctx.type)} as platform`,
                    task: (ctx, task) => {
                        return Helper.Project.updatePlatformConfig(ctx.type);
                    },
                }, {
                    title: `Adding platform specific properties to app.json`,
                    task: (ctx, task) => {
                        return Helper.Project.updateModelPlatformDefault(ctx.type);
                    },
                }, {
                    title: `Adding ${highlight(ctx.endpoint)} as endpoint`,
                    enabled: (ctx) => ctx.endpoint !== Helper.ENDPOINT_NONE,
                    task: (ctx, task) => {
                        let info = 'Info: ';
                        let p = Promise.resolve();

                        return p.then(() => Helper.Project.getEndpoint(ctx.endpoint))
                            .then((uri) => {
                                info += 'Endpoint uri: '+uri;
                                task.skip(info);
                                return Helper.Project.updateConfig({endpoint: uri});
                            }).catch((error) => {
                                info += error.message;
                                task.skip(info);
                            });
                    },
                },
            ]);
        },
    };
};

module.exports.getTask = function(ctx) {
    let platformsPath = Helper.Project.getPlatformsPath();
    if (!fs.existsSync(platformsPath)) {
        fs.mkdirSync(platformsPath);
    }

    if (ctx.type.indexOf(Helper.PLATFORM_ALEXASKILL) > -1) {
        let alexaSkillPath = AlexaHelper.getPath();
        if (!fs.existsSync(alexaSkillPath)) {
            fs.mkdirSync(alexaSkillPath);
        }

        return [
            {
                title: 'Getting Alexa Skill project for ASK profile ' + highlight(ctx.askProfile),
                enabled: (ctx) => ctx.target === Helper.TARGET_ALL ||
                    ctx.target === Helper.TARGET_INFO,
                task: (ctx, task) => {
                    let p = Promise.resolve();
                    ctx.info = 'Info: ';

                    p = p
                        .then(() => AlexaHelper.Ask.checkAsk())
                        .then(() => AlexaHelper.Ask.askApiGetSkill(
                            ctx, AlexaHelper.getSkillJsonPath()))
                        .then(() => AlexaHelper.setAlexaSkillId(ctx.skillId))
                        .then(() => AlexaHelper.Ask.askApiGetAccountLinking(ctx))
                        .then((accountLinkingJson) => {
                            if (accountLinkingJson) {
                                fs.writeFile(AlexaHelper.getAccountLinkingPath(),
                                    accountLinkingJson, function(err) {
                                    if (err) {
                                        return Promise.reject(err);
                                    }
                                    ctx.info += 'Account Linking Information saved to ' + AlexaHelper.getAccountLinkingPath();
                                    return Promise.resolve();
                                });
                            } else {
                                return Promise.resolve();
                            }
                        }).then(() => {
                            let info = 'Info: ';
                            let skillInfo = AlexaHelper.getSkillSimpleInformation();
                            info += `Skill Name: ${skillInfo.name}
Skill ID: ${skillInfo.skillId}
Endpoint: ${skillInfo.endpoint}`;
                            task.skip(info);
                        });
                    return p;
                },
            },
            {
                title: 'Getting Alexa Skill model files and saving to /platforms/alexaSkill/models',
                enabled: (ctx) => ctx.target === Helper.TARGET_ALL ||
                    ctx.target === Helper.TARGET_MODEL,
                task: (ctx) => {
                    let alexaModelPath = AlexaHelper.getModelsPath();
                    if (!fs.existsSync(alexaModelPath)) {
                        fs.mkdirSync(alexaModelPath);
                    }
                    let skillJson = AlexaHelper.getSkillJson();

                    let locales = Object.keys(
                        skillJson.manifest.publishingInformation.locales);

                    if (ctx.locale && ctx.target === Helper.TARGET_MODEL) {
                        locales = [ctx.locale];
                    }

                    let getLocaleSubtasks = [];
                    for (let locale of locales) {
                        getLocaleSubtasks.push({
                            title: locale,
                            task: (ctx) => {
                                return AlexaHelper.Ask.askApiGetModel(
                                    ctx,
                                    AlexaHelper.getModelPath(locale),
                                    locale
                                );
                            },
                        });
                    }
                    return new Listr(getLocaleSubtasks);
                },
            },
        ];
    } else if (ctx.type.indexOf(Helper.PLATFORM_GOOGLEACTION) > -1) {
        let googleActionPath = GoogleActionUtil.getPath();
        if (!fs.existsSync(googleActionPath)) {
            fs.mkdirSync(googleActionPath);
        }


        let dialogflowPath = DialogFlowHelper.getPath();
        if (!fs.existsSync(dialogflowPath)) {
            fs.mkdirSync(dialogflowPath);
        }

        return [
            {
                title: 'Getting Dialogflow Agent files and saving to /platforms/googleAction/dialogflow',
                task: (ctx, task) => {
                    let keyFile = Helper.Project.getConfigParameter('googleAction.dialogflow.keyFile', ctx.stage);
                    let p = Promise.resolve();
                    if (keyFile) {
                        if (!fs.existsSync(process.cwd() + pathSep + keyFile)) {
                            throw new Error(
                                `Keyfile ${process.cwd() + pathSep + keyFile} does not exist.`);
                        }
                        ctx.keyFile = process.cwd() + pathSep + keyFile;
                        p = p.then(() => DialogFlowHelper.v2.activateServiceAccount(ctx));
                    }


                    p = p.then(() => DialogFlowHelper.getAgentFiles(ctx));
                    return p;
                },
            },
        ];
    }
};

module.exports.buildTask = function(ctx) {
    let platformsPath = Helper.Project.getPlatformsPath();
    if (!fs.existsSync(platformsPath)) {
        fs.mkdirSync(platformsPath);
    }
    //

    let buildPlatformTasks = [];
    if (ctx.type.indexOf(Helper.PLATFORM_ALEXASKILL) > -1) {
        let title = 'Creating /platforms/alexaSkill';
        let hasAlexaSkill = Helper.Project.hasAlexaSkill();

        if (hasAlexaSkill) {
            title = 'Updating /platforms/alexaSkill';
        }

        buildPlatformTasks.push({
            title: title,
            task: () => {
                let titleInteractionModel = 'Creating Alexa Interaction Model based on Jovo Language Model in ' + highlight('/models');
                if (hasAlexaSkill) {
                    titleInteractionModel = 'Updating Alexa Interaction Model based on Jovo Language Model in ' + highlight('/models');
                }

                return new Listr([
                    {
                    title: 'Creating Alexa project files',
                    enabled: () => !hasAlexaSkill,
                    task: () => {
                        return new Listr([
                            {
                                title: 'skill.json',
                                task: (ctx, task) => {
                                    return AlexaHelper.createAlexaSkill(ctx)
                                        .then(() => {
                                            if (ctx.invocation) {
                                                return Helper.Project.updateInvocation(
                                                    ctx.invocation,
                                                    ctx.locales[0]
                                                );
                                            }
                                            return Promise.resolve();
                                        })
                                        .then(() => AlexaHelper.buildSkillAlexa(ctx.stage))
                                        .then(() => wait(500));
                                },
                            },
                        ]);
                    },
                },
                {
                    title: 'Updating Alexa project files',
                    enabled: () => hasAlexaSkill,
                    task: () => {
                        return new Listr([
                            {
                                title: 'skill.json',
                                task: (ctx, task) => {
                                    return AlexaHelper.buildSkillAlexa(ctx.stage)
                                        .then(() => wait(500));
                                },
                            },
                        ]);
                    },
                }, {
                    title: titleInteractionModel,
                    enabled: () => Helper.Project.hasModelFiles(ctx.locales),
                    task: (ctx) => {
                        let buildLocalesTasks = [];
                        // throw new Error(JSON.stringify(ctx.locales))
                        for (let locale of ctx.locales) {
                            buildLocalesTasks.push({
                                title: locale,
                                task: () => {
                                    return AlexaHelper.buildLanguageModelAlexa(locale, ctx.stage)
                                        .then(() => wait(500));
                                },
                            });
                        }
                        return new Listr(buildLocalesTasks);
                    },
                }]);
            },
        });
    }
    if (ctx.type.indexOf(Helper.PLATFORM_GOOGLEACTION) > -1) {
        let googleActionPath = GoogleActionUtil.getPath();
        if (!fs.existsSync(googleActionPath)) {
            fs.mkdirSync(googleActionPath);
        }
        let dialogFlowPath = DialogFlowHelper.getPath();
        if (!fs.existsSync(dialogFlowPath)) {
            fs.mkdirSync(dialogFlowPath);
        }
        let hasGoogleActionDialogflow = Helper.Project.hasGoogleActionDialogFlow();
        let title = 'Creating /platforms/googleAction/dialogflow';
        let titleAgentJson = 'Creating Dialogflow Agent';
        let titleInteractionModel = 'Creating Language Model based on Jovo Language Model in ' + highlight('/models');

        if (hasGoogleActionDialogflow) {
            title = 'Updating /platforms/googleAction/dialogflow';
            titleAgentJson = 'Updating Dialogflow Agent';
            titleInteractionModel = 'Updating Dialogflow Language Model based on Jovo Language Model in ' + highlight('/models');
        }
        buildPlatformTasks.push({
            title: title,
            task: () => {
                let buildSubTasks = [{
                    title: titleAgentJson,
                    task: (ctx) => {
                        return new Listr([
                            {
                                title: 'agent.json',
                                task: () => {
                                    return Promise.resolve();
                                },
                            },
                            {
                                title: 'package.json',
                                task: (ctx, task) => {
                                    return DialogFlowHelper.buildDialogFlowAgent(ctx)
                                        .then(() => wait(500));
                                },
                            },
                        ]);
                    },
                }, {
                    title: titleInteractionModel,
                    task: (ctx) => {
                        let buildLocalesTasks = [];
                        // delete old folder
                        if (fs.existsSync(DialogFlowHelper.getIntentsFolderPath())) {
                            fs.readdirSync(DialogFlowHelper.getIntentsFolderPath()).forEach(function(file, index) { //eslint-disable-line
                                let curPath = DialogFlowHelper.getIntentsFolderPath() + pathSep + file; //eslint-disable-line
                                fs.unlinkSync(curPath);
                            });
                        }

                        if (fs.existsSync(DialogFlowHelper.getEntitiesFolderPath())) {
                            fs.readdirSync(DialogFlowHelper.getEntitiesFolderPath()).forEach(function(file, index) { //eslint-disable-line
                                let curPath = DialogFlowHelper.getEntitiesFolderPath() + pathSep + file; //eslint-disable-line
                                fs.unlinkSync(curPath);
                            });
                        }
                        for (let locale of ctx.locales) {
                            buildLocalesTasks.push({
                                title: locale,
                                task: () => {
                                    return DialogFlowHelper
                                        .buildLanguageModelDialogFlow(locale)
                                        .then(() => wait(500));
                                },
                            });
                        }
                        return new Listr(buildLocalesTasks);
                    },
                }];
                return new Listr(buildSubTasks);
            },
        });
    }
    return buildPlatformTasks;
};

module.exports.buildReverseTask = function(ctx) {
    let buildReverseSubtasks = [];
    buildReverseSubtasks.push({
        title: 'Creating backups',
        enabled: (ctx) => ctx.reverse === Prompts.ANSWER_BACKUP,
        task: (ctx) => {
            let backupLocales = [];
            for (let locale of ctx.locales) {
                backupLocales.push({
                    title: locale,
                    task: () => {
                        return Helper.Project.backupModel(locale);
                    },
                });
            }
            return new Listr(backupLocales);
        },
    });

    if (ctx.type.indexOf(Helper.PLATFORM_ALEXASKILL) > -1) {
        buildReverseSubtasks.push({
            title: 'Reversing model files',
            task: (ctx) => {
                let reverseLocales = [];
                let locales = AlexaHelper.getLocales(ctx.locales);
                for (let locale of locales) {
                    reverseLocales.push({
                        title: locale.toString(),
                        task: () => {
                            let alexaModel = AlexaHelper.getModel(locale);
                            let alexaInteractionModel =
                                new AlexaHelper.AlexaInteractionModel(alexaModel);
                            let jovoModel = alexaInteractionModel.reverse(alexaModel);
                            return Helper.Project.saveModel(
                                jovoModel,
                                locale);
                        },
                    });
                }
                return new Listr(reverseLocales);
            },
        });

        try {
            Helper.Project.getConfigParameter('alexaSkill', ctx.stage);
        } catch (err) {
            buildReverseSubtasks.push({
                title: 'Initializing Alexa Skill into app.json',
                task: (ctx) => {
                    return Helper.Project.updatePlatformConfig(Helper.PLATFORM_ALEXASKILL);
                },
            });
        }
    } else if (ctx.type.indexOf(Helper.PLATFORM_GOOGLEACTION) > -1) {
        buildReverseSubtasks.push({
            title: 'Reversing model files',
            task: (ctx) => {
                let reverseLocales = [];

                let agentJson = DialogFlowHelper.getAgentJson();
                let supportedLanguages = [];

                if (!supportedLanguages || supportedLanguages.length === 0) {
                    supportedLanguages.push(agentJson.language);
                } else {
                    supportedLanguages = agentJson.supportedLanguages;
                }


                for (let locale of supportedLanguages) {
                    reverseLocales.push({
                        title: locale,
                        task: () => {
                            let jovoModel = require('./../helper/dialogFlowAgent')
                                .DialogFlowAgent.reverse(locale);
                            return Helper.Project.saveModel(
                                jovoModel,
                                locale);
                        },
                    });
                }
                return new Listr(reverseLocales);
            },
        });
        try {
            Helper.Project.getConfigParameter('googleAction', ctx.stage);
        } catch (err) {
            buildReverseSubtasks.push({
                title: 'Initializing GoogleAction into app.json',
                task: (ctx) => {
                    return Helper.Project.updatePlatformConfig(Helper.PLATFORM_ALEXASKILL);
                },
            });
        }
    }

    return new Listr(buildReverseSubtasks);
};


module.exports.deployTask = function(ctx) {
    let platformsPath = Helper.Project.getPlatformsPath();
    if (!fs.existsSync(platformsPath)) {
        fs.mkdirSync(platformsPath);
    }
    let deployPlatformTasks = [];
    let globalConfig = Helper.Project.getConfig();
    let stageConfig = _.get(Helper.Project.getConfig(), `stages.${ctx.stage}`);
    if (ctx.type.indexOf(Helper.PLATFORM_ALEXASKILL) > -1) {
        try {
            ctx.skillId = AlexaHelper.getSkillId();
        } catch (error) {
            if (ctx.target !== Helper.TARGET_LAMBDA) {
                console.log(`Couldn't find a platform. Please use init <platform> or get to retrieve platform files.`); // eslint-disable-line
                return [];
            }
        }

        let endpoint =
            _.get(stageConfig, 'alexaSkill.endpoint') ||
            _.get(stageConfig, 'endpoint');
            _.get(globalConfig, 'endpoint');

        let arn = _.startsWith(endpoint.uri, 'arn') ? endpoint.uri : undefined;

        deployPlatformTasks.push({
            title: 'Deploying Alexa Skill',
            task: (ctx, task) => {
                return new Listr([
                    {
                        title:
                            `Creating Alexa Skill project for ASK profile ${highlight(ctx.askProfile)}`, // eslint-disable-line
                        enabled: (ctx) => _.isUndefined(ctx.skillId) &&
                            ctx.target !== Helper.TARGET_LAMBDA,
                        task: (ctx) => {
                            ctx.target = Helper.TARGET_ALL;
                            return AlexaHelper.Ask.checkAsk().then((err) => {
                                if (err) {
                                    return Promise.reject(err);
                                }
                                return AlexaHelper.Ask.askApiCreateSkill(
                                    ctx,
                                    AlexaHelper.getSkillJsonPath()
                                ).then((skillId) => {
                                    ctx.skillId = skillId;
                                    ctx.newSkill = true;
                                    return AlexaHelper.setAlexaSkillId(skillId);
                                }).then(() => getSkillStatus(ctx)).then(() => {
                                    let info = 'Info: ';
                                    let skillInfo = AlexaHelper.getSkillInformation();
                                    info += `Skill Name: ${skillInfo.name}
Skill ID: ${skillInfo.skillId}
Invocation Name: ${skillInfo.invocationName}
Endpoint: ${skillInfo.endpoint}`;
                                    task.skip(info);
                                });
                            });
                        },
                    }, {
                        title: 'Updating Alexa Skill project for ASK profile ' + ctx.askProfile,
                        enabled: (ctx) => !_.isUndefined(ctx.skillId) &&
                            _.isUndefined(ctx.newSkill) &&
                            (ctx.target === Helper.TARGET_ALL || ctx.target === Helper.TARGET_INFO),
                        task: (ctx, task) => {
                            return AlexaHelper.Ask.askApiUpdateSkill(
                                ctx,
                                AlexaHelper.getSkillJsonPath()
                            ).then(() => getSkillStatus(ctx)).then(() => {
                                let info = 'Info: ';
                                let skillInfo = AlexaHelper.getSkillInformation();
                                info += `Skill Name: ${skillInfo.name}
Skill ID: ${skillInfo.skillId}
Invocation Name: ${skillInfo.invocationName}
Endpoint: ${skillInfo.endpoint}`;
                                task.skip(info);
                                return Promise.resolve();
                            });
                        },
                    }, {
                        title: 'Deploying Interaction Model, waiting for build',
                        enabled: (ctx) => ctx.target === Helper.TARGET_ALL ||
                            ctx.target === Helper.TARGET_MODEL,
                        task: (ctx) => {
                            let deployLocaleTasks = [];


                            // TODO: what to do with --locale <locale>
                            for (let locale of AlexaHelper.getLocales()) {
                                deployLocaleTasks.push({
                                    title: locale,
                                    task: (ctx) => {
                                        let config = _.cloneDeep(ctx);
                                        config.locale = locale;
                                        return AlexaHelper.Ask.askApiUpdateModel(
                                            config,
                                            AlexaHelper.getModelPath(locale),
                                            locale).then(() => getModelStatus(config));
                                    },
                                });
                            }
                            return new Listr(deployLocaleTasks);
                        },
                    },
                    {
                        title: 'Uploading to lambda',
                        enabled: (ctx) => !ctx.newSkill &&
                            (ctx.target === Helper.TARGET_ALL ||ctx.target === Helper.TARGET_LAMBDA) &&
                            _.isUndefined(arn) === false,
                        task: (ctx, task) => {
                            try {
                                let appJson = Helper.Project.getConfig(ctx.stage);
                                ctx.lambdaArn = arn;

                                let p = Promise.resolve();

                                // special use case
                                // copy app.json if src directory is not default and config
                                // was set in app.json
                                if (Helper.Project.getConfigParameter('src', ctx.stage) && appJson.config) {
                                    p = p.then(
                                        () => Helper.Project.moveTempJovoConfig(Helper.Project.getConfigParameter('src', ctx.stage)));
                                }

                                p = p.then(() => AlexaHelper.Ask.checkAsk()).then((err) => {
                                    if (err) {
                                        return Promise.reject(err);
                                    }
                                    return AlexaHelper.Ask.askLambdaUpload(ctx);
                                });

                                if (Helper.Project.getConfigParameter('src', ctx.stage) && appJson.config) {
                                    p = p.then(
                                        () => Helper.Project.deleteTempJovoConfig(Helper.Project.getConfigParameter('src', ctx.stage)));
                                }

                                p = p.then(() => {
                                    let info = 'Info: ';

                                    info += `Deployed to lambda function: ${arn}`;
                                    task.skip(info);
                                });
                                return p;
                            } catch (err) {
                                throw err;
                            }
                        },
                    },
                    {
                        title: 'Enabling skill for testing',
                        enabled: (ctx) => !_.isUndefined(ctx.newSkill),
                        task: (ctx) => {
                            return AlexaHelper.Ask.askApiEnableSkill(ctx);
                        },
                    },
                ]);
            },
        });
    }
    if (ctx.type.indexOf(Helper.PLATFORM_GOOGLEACTION) > -1) {
        let arn = _.get(stageConfig, 'googleAction.host.lambda.arn') ||
            _.get(stageConfig, 'host.lambda.arn') ||
            _.get(globalConfig, 'googleAction.host.lambda.arn') ||
            _.get(globalConfig, 'host.lambda.arn');

        if (!arn) {
            arn = _.get(stageConfig, 'googleAction.endpoint') ||
                _.get(stageConfig, 'endpoint') ||
                _.get(globalConfig, 'googleAction.endpoint') ||
                _.get(globalConfig, 'endpoint');
            arn = _.startsWith(arn, 'arn') ? arn : undefined;
        }

        deployPlatformTasks.push({
            title: 'Deploying Google Action',
            task: (ctx, task) => {
                return new Listr([
                    {
                        title: 'Creating file /googleAction/dialogflow_agent.zip',
                        task: (ctx, task) => {
                            return DialogFlowHelper.zip().then(() => {
                                let info = 'Info: ';

                                info += `Language model: `;
                                for (let locale of Helper.Project.getLocales()) {
                                    info += `${locale} `;
                                }
                                info += '\n';
                                info += `Fulfillment Endpoint: ${DialogFlowHelper.getAgentJson().webhook.url}`; // eslint-disable-line
                                task.skip(info);
                            });
                        },
                    },
                    {
                        title: `Uploading and restoring agent for project ${highlight(ctx.projectId)}`, // eslint-disable-line
                        enabled: (ctx) => ctx.projectId,
                        task: (ctx, task) => {
                            ctx.pathToZip = GoogleActionUtil.getPath() + '/dialogflow_agent.zip';

                            let keyFile = Helper.Project.getConfigParameter('googleAction.dialogflow.keyFile', ctx.stage);
                            let p = Promise.resolve();
                            if (keyFile) {
                                if (!fs.existsSync(process.cwd() + pathSep + keyFile)) {
                                    throw new Error(
                                        `Keyfile ${process.cwd() + pathSep + keyFile} does not exist.`);
                                }
                                ctx.keyFile = process.cwd() + pathSep + keyFile;
                                p = p.then(() => DialogFlowHelper.v2.activateServiceAccount(ctx));
                            }

                            p = p.then(() => DialogFlowHelper.v2.checkGcloud())
                                .then(() => DialogFlowHelper.v2.restoreAgent(ctx));
                            return p;
                        },
                    },
                    {
                        title: 'Training started',
                        enabled: (ctx) => ctx.projectId,
                        task: (ctx, task) => {
                            return DialogFlowHelper.v2.trainAgent(ctx);
                        },
                    },
                    {
                        title: 'Uploading to lambda', // needs to be refactored
                        enabled: (ctx) => (ctx.target === Helper.TARGET_ALL || ctx.target === Helper.TARGET_LAMBDA) &&
                            _.isUndefined(arn) === false,
                        task: (ctx, task) => {
                            try {
                                let appJson = Helper.Project.getConfig(ctx.stage);
                                ctx.lambdaArn = arn;

                                let p = Promise.resolve();

                                // special use case
                                // copy app.json if src directory is not default and config
                                // was set in app.json
                                if (Helper.Project.getConfigParameter('src', ctx.stage) && appJson.config) {
                                    p = p.then(
                                        () => Helper.Project.moveTempJovoConfig(Helper.Project.getConfigParameter('src', ctx.stage)));
                                }

                                p = p.then(() =>AlexaHelper.Ask.askLambdaUpload(ctx));

                                if (Helper.Project.getConfigParameter('src', ctx.stage) && appJson.config) {
                                    p = p.then(
                                        () => Helper.Project.deleteTempJovoConfig(Helper.Project.getConfigParameter('src', ctx.stage)));
                                }

                                p = p.then(() => {
                                    let info = 'Info: ';

                                    info += `Deployed to lambda function: ${arn}`;
                                    task.skip(info);
                                });
                                return p;
                            } catch (err) {
                                throw err;
                            }
                        },
                    },
                ]);
            },
        });
    }
    return deployPlatformTasks;
};

/**
 * Asks for model status every 5 seconds
 * @param {*} config
 * @return {Promise<any>}
 */
function getModelStatus(config) {
    return wait(5000).then(() => AlexaHelper.Ask.askApiGetSkillStatus(config)).then((status) => {
        // return Promise.reject(new Error(status));
        if (_.get(status, `interactionModel.${config.locale}.lastUpdateRequest.status`) === 'IN_PROGRESS') {
            return getModelStatus(config);
        } else if (_.get(status, `interactionModel.${config.locale}.lastUpdateRequest.status`) === 'SUCCEEDED') {
            Promise.resolve();
        } else {
            Promise.reject();
        }
    });
}

/**
 * Asks for skillStatus every 5 seconds
 * @param {*} config
 * @return {Promise<any>}
 */
function getSkillStatus(config) {
    return wait(5000).then(() => AlexaHelper.Ask.askApiGetSkillStatus(config)).then((status) => {
        // return Promise.reject(new Error(status));
        if (_.get(status, `manifest.lastUpdateRequest.status`) === 'IN_PROGRESS') {
            return getSkillStatus(config);
        } else if (_.get(status, `manifest.lastUpdateRequest.status`) === 'SUCCEEDED') {
            Promise.resolve();
        } else {
            Promise.reject();
        }
    });
}

/**
 * Timeout promise
 * @param {Number} ms
 * @return {Promise<any>}
 */
function wait(ms) {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve();
        }, ms);
    });
}

