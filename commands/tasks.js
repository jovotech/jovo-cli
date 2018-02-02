'use strict';

const Helper = require('../helper/lmHelper');
const AlexaHelper = require('../helper/alexaUtil');
const DialogFlowHelper = require('../helper/dialogflowUtil');
const GoogleActionUtil = require('../helper/googleActionUtil');

const fs = require('fs');
const Listr = require('listr');
const _ = require('lodash');
const Prompts = require('./../utils/prompts');

module.exports.newTask = function(ctx) {

};

module.exports.initTask = function(ctx) {
    return new Promise((resolve, reject) => {
        try {
            let platformConfig;
            let p = Promise.resolve();
            if (ctx.type === Helper.PLATFORM_ALEXASKILL) {
                platformConfig = {
                    alexaSkill: {
                        nlu: 'alexa',
                    },
                };
            } else if (ctx.type === Helper.PLATFORM_GOOGLEACTION) {
                platformConfig = {
                    googleAction: {
                        nlu: {
                            name: 'dialogflow',
                            version: 1,
                        },
                    },
                };
            }
            if (platformConfig) {
                p = p.then(() => Helper.Project.updateConfig(platformConfig));
            }
            p = p.then(() => Helper.Project.updateEndpoint(ctx.endpoint))
                .then(() => resolve());
        } catch (err) {
            reject();
        }
    });
};


module.exports.getTask = function(ctx) {
    let platformsPath = Helper.Project.getPlatformsPath();
    if (!fs.existsSync(platformsPath)) {
        fs.mkdirSync(platformsPath);
    }
    if (ctx.type === Helper.PLATFORM_ALEXASKILL) {
        let alexaSkillPath = AlexaHelper.getPath();
        if (!fs.existsSync(alexaSkillPath)) {
            fs.mkdirSync(alexaSkillPath);
        }

        return new Listr([
            {
                title: 'Getting Alexa Skill files',
                enabled: (ctx) => ctx.target === Helper.TARGET_ALL ||
                    ctx.target === Helper.TARGET_INFO,
                task: (ctx, task) => {
                    let p = Promise.resolve();
                    ctx.info = 'Info: ';

                    p = p
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
                            task.skip(ctx.info);
                        });
                    return p;
                },
            },
            {
                title: 'Getting Alexa Skill model files',
                enabled: (ctx) => ctx.target === Helper.TARGET_ALL ||
                    ctx.target === Helper.TARGET_MODEL,
                task: (ctx, task) => {
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
                            title: 'Fetching ' + locale,
                            task: (ctx, task) => {
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
        ]);
    }
};

module.exports.buildTask = function(ctx) {
    let platformsPath = Helper.Project.getPlatformsPath();
    if (!fs.existsSync(platformsPath)) {
        fs.mkdirSync(platformsPath);
    }
    if (ctx.type === Helper.PLATFORM_ALEXASKILL || ctx.type === Helper.PLATFORM_ALL) {
        return new Listr([
            {
                title: 'Building Alexa ',
                task: (ctx, task) => {
                    let info = 'Info: ';
                    let buildSubTasks = [{
                        title: 'Creating initial Alexa project files' + Helper.Project.hasAlexaSkill(),
                        enabled: () => Helper.Project.hasAlexaSkill() === false,
                        task: (ctx, task) => {
                           return AlexaHelper.createAlexaSkill(ctx)
                               .then(() => Helper.Project.updateEndpoint(ctx.endpoint))
                               .then(() => Helper.Project.updateConfig({
                                   alexaSkill: {
                                       nlu: 'alexa',
                                   },
                               })).then(() => {
                                   if (ctx.invocation) {
                                       return Helper.Project.updateInvocation(
                                           ctx.invocation,
                                           ctx.locales[0]
                                       );
                                   }
                                   return Promise.resolve();
                               });
                        },
                    }, {
                        title: 'Building Alexa skill.json',
                        task: (ctx, task) => {
                            return AlexaHelper.buildSkillAlexa();
                        },
                    }, {
                        title: 'Building Alexa language model',
                        task: (ctx, task) => {
                            let buildLocalesTasks = [];

                            for (let locale of ctx.locales) {
                                buildLocalesTasks.push({
                                    title: locale,
                                    task: (ctx, task) => {
                                        return AlexaHelper.buildLanguageModelAlexa(locale);
                                    },
                                });
                            }
                            return new Listr(buildLocalesTasks);
                        },
                    }];
                    return new Listr(buildSubTasks);
                },
            },
        ]);
    }
    if (ctx.type === Helper.PLATFORM_GOOGLEACTION || ctx.type === Helper.PLATFORM_ALL) {
        let googleActionPath = GoogleActionUtil.getPath();
        if (!fs.existsSync(googleActionPath)) {
            fs.mkdirSync(googleActionPath);
        }
        let dialogFlowPath = DialogFlowHelper.getPath();
        if (!fs.existsSync(dialogFlowPath)) {
            fs.mkdirSync(dialogFlowPath);
        }
        return new Listr([
            {
                title: 'Building Google Action (DialogFlow)',
                task: (ctx, task) => {
                    let buildSubTasks = [{
                        title: 'Creating initial GoogleAction/Dialogflow project files' + Helper.Project.hasAlexaSkill(),
                        enabled: () => Helper.Project.hasGoogleActionDialogFlow() === false,
                        task: (ctx, task) => {
                            return Helper.Project.updateEndpoint(ctx.endpoint)
                                .then(() => Helper.Project.updateConfig({
                                    googleAction: {
                                        nlu: 'dialogflow',
                                    },
                                }));
                        },
                    }, {
                        title: 'Building Alexa agent.json',
                        task: (ctx, task) => {
                            return DialogFlowHelper.buildDialogFlowAgent(ctx);
                        },
                    }, {
                        title: 'Building Alexa language model',
                        task: (ctx, task) => {
                            let buildLocalesTasks = [];

                            for (let locale of ctx.locales) {
                                buildLocalesTasks.push({
                                    title: locale,
                                    task: (ctx, task) => {
                                        return DialogFlowHelper
                                            .buildLanguageModelDialogFlow(locale);
                                    },
                                });
                            }
                            return new Listr(buildLocalesTasks);
                        },
                    }];
                    return new Listr(buildSubTasks);

                },
            },
        ]);
    }
};

module.exports.buildReverseTask = function(ctx) {
    let buildReverseSubtasks = [];

    buildReverseSubtasks.push({
        title: 'Creating backups',
        enabled: (ctx) => ctx.reverse === Prompts.ANSWER_BACKUP,
        task: (ctx, task) => {
            let backupLocales = [];
            for (let locale of ctx.locales) {
                backupLocales.push({
                    title: locale,
                    task: (ctx, task) => {
                        return Helper.Project.backupModel(locale);
                    },
                });
            }
            return new Listr(backupLocales);
        },
    });

    buildReverseSubtasks.push({
        title: 'Reversing model files',
        task: (ctx, task) => {
            let reverseLocales = [];
            for (let locale of ctx.locales) {
                reverseLocales.push({
                    title: locale,
                    task: (ctx, task) => {
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
    return new Listr(buildReverseSubtasks);
};


module.exports.deployTask = function(ctx) {
    let platformsPath = Helper.Project.getPlatformsPath();
    if (!fs.existsSync(platformsPath)) {
        fs.mkdirSync(platformsPath);
    }

    if (ctx.type === Helper.PLATFORM_ALEXASKILL || ctx.type === Helper.PLATFORM_ALL) {
        ctx.skillId = AlexaHelper.getSkillId();

        return new Listr([
            {
                title: 'Creating new skill',
                enabled: (ctx) => _.isUndefined(ctx.skillId),
                task: (ctx, task) => {
                    ctx.target = Helper.TARGET_ALL;
                    let p = AlexaHelper.Ask.checkAsk().then((err) => {
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
                        }).then(() => getSkillStatus(ctx));
                    });
                    return p;
                },
            }, {
                title: 'Updating skill information',
                enabled: (ctx) => !_.isUndefined(ctx.skillId) && _.isUndefined(ctx.newSkill) &&
                    (ctx.target === Helper.TARGET_ALL || ctx.target === Helper.TARGET_INFO),
                task: (ctx, task) => {
                    return AlexaHelper.Ask.askApiUpdateSkill(
                        ctx,
                        AlexaHelper.getSkillJsonPath()
                    ).then(() => getSkillStatus(ctx));
                },
            }, {
                title: 'Deploying language model',
                enabled: (ctx) => ctx.target === Helper.TARGET_ALL ||
                    ctx.target === Helper.TARGET_MODEL,
                task: (ctx, task) => {
                    let deployLocaleTasks = [];

                    for (let locale of ctx.locales) {
                        deployLocaleTasks.push({
                            title: locale,
                            task: (ctx, task) => {
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
                title: 'Enabling skill',
                enabled: (ctx) => !_.isUndefined(ctx.newSkill),
                task: (ctx, task) => {
                    return AlexaHelper.Ask.askApiEnableSkill(ctx);
                },
            },
        ]);
    }
    if (ctx.type === Helper.PLATFORM_GOOGLEACTION || ctx.type === Helper.PLATFORM_ALL) {
        return new Listr([
            {
                title: 'Creating zip file',
                task: (ctx, task) => {
                    return DialogFlowHelper.zip().then(() => task.skip('bla'));
                },
            },
        ]);
    }
};

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
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve();
        }, ms);
    });
}
