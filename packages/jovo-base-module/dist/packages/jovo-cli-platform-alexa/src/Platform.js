'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const AlexaInteractionModel = require('./AlexaInteractionModel').AlexaInteractionModel;
const _ = require("lodash");
const fs = require("fs");
const path = require("path");
const ask = require("./Ask");
const jovo_cli_core_1 = require("jovo-cli-core");
const listr = require("listr");
const highlight = require('chalk').white.bold;
const project = require('jovo-cli-core').getProject();
class JovoCliPlatformAlexa extends jovo_cli_core_1.JovoCliPlatform {
    constructor() {
        super();
    }
    getPlatformConfigIds(project, argOptions) {
        try {
            let skillId;
            if (argOptions && argOptions.hasOwnProperty('skill-id') && argOptions['skill-id']) {
                skillId = argOptions['skill-id'];
            }
            else {
                skillId = project.getConfigParameter('alexaSkill.skillId', argOptions && argOptions.stage) || this.getSkillId();
            }
            const returnValue = {};
            if (skillId) {
                returnValue.skillId = skillId;
            }
            return returnValue;
        }
        catch (error) {
            return {};
        }
    }
    getPlatformConfigValues(project, argOptions) {
        let askProfile;
        if (argOptions && argOptions.hasOwnProperty('ask-profile') && argOptions['ask-profile']) {
            askProfile = argOptions['ask-profile'];
        }
        return {
            askProfile: askProfile ||
                project.getConfigParameter('alexaSkill.ask-profile', argOptions && argOptions.stage) ||
                project.getConfigParameter('alexaSkill.askProfile', argOptions && argOptions.stage) ||
                project.getConfigParameter('host.lambda.ask-Profile', argOptions && argOptions.stage) ||
                project.getConfigParameter('host.lambda.askProfile', argOptions && argOptions.stage) ||
                ask.DEFAULT_ASK_PROFILE,
        };
    }
    getExistingProjects(config) {
        return ask.checkAsk()
            .then(() => ask.askApiListSkills(config));
    }
    getAdditionalCliOptions(command, vorpalCommand) {
        if (command === 'get') {
            vorpalCommand
                .option('-s, --skill-id <skillId>', 'Alexa Skill ID');
        }
        if (['build', 'deploy', 'get', 'init', 'new'].includes(command)) {
            vorpalCommand
                .option('--ask-profile <askProfile>', 'Name of use ASK profile \n\t\t\t\tDefault: default');
        }
    }
    validateAdditionalCliOptions(command, args) {
        if (['build', 'deploy', 'get', 'init', 'new'].includes(command)) {
            return this.isValidAskProfile(args.options['ask-profile']);
        }
        return true;
    }
    hasPlatform() {
        try {
            const filePath = this.getSkillJsonPath();
            require(filePath);
            return true;
        }
        catch (err) {
            return false;
        }
    }
    setPlatformDefaults(model) {
        if (_.get(model, 'alexa.interactionModel.languageModel.intents')) {
            const result = _.unionBy(_.get(model, 'alexa.interactionModel.languageModel.intents'), this.getDefaultIntents(), 'name');
            _.set(model, 'alexa.interactionModel.languageModel.intents', result);
        }
        else {
            _.set(model, 'alexa.interactionModel.languageModel.intents', this.getDefaultIntents());
        }
        let jovoIntent;
        if (model.intents) {
            for (jovoIntent of model.intents) {
                if (_.get(jovoIntent, 'alexa.name')) {
                    _.remove(_.get(model, 'alexa.interactionModel.languageModel.intents'), (currentObject) => {
                        return currentObject.name === jovoIntent.alexa.name;
                    });
                }
            }
        }
        if (_.get(model, 'alexa.interactionModel.languageModel.intents').length === 0) {
            delete model.alexa.interactionModel.languageModel.intents;
            if (_.keys(_.get(model, 'alexa.interactionModel.languageModel')).length === 0) {
                delete model.alexa.interactionModel.languageModel;
            }
            if (_.keys(_.get(model, 'alexa.interactionModel')).length === 0) {
                delete model.alexa['interactionModel'];
            }
            if (_.keys(_.get(model, 'alexa')).length === 0) {
                delete model.alexa;
            }
        }
        return model;
    }
    addPlatfromToConfig(config) {
        if (!config.alexaSkill) {
            _.extend(config, {
                alexaSkill: {
                    nlu: {
                        name: 'alexa',
                    },
                },
            });
        }
        return config;
    }
    isValidAskProfile(askProfile) {
        if (askProfile) {
            if (askProfile.length === 0) {
                console.log('--ask profile cannot be empty');
                return false;
            }
        }
        return true;
    }
    getDefaultIntents() {
        return [
            {
                'name': 'AMAZON.CancelIntent',
                'samples': [],
            },
            {
                'name': 'AMAZON.HelpIntent',
                'samples': [],
            },
            {
                'name': 'AMAZON.StopIntent',
                'samples': [],
            },
        ];
    }
    getBuildTasks(ctx) {
        let title = 'Creating /platforms/alexaSkill ' + jovo_cli_core_1.Utils.printStage(ctx.stage);
        const hasAlexaSkill = this.hasPlatform();
        if (hasAlexaSkill) {
            title = 'Updating /platforms/alexaSkill ' + jovo_cli_core_1.Utils.printStage(ctx.stage);
        }
        const buildPlatformTasks = [];
        buildPlatformTasks.push({
            title,
            task: () => {
                let titleInteractionModel = 'Creating Alexa Interaction Model based on Jovo Language Model in ' + highlight('/models');
                if (hasAlexaSkill) {
                    titleInteractionModel = 'Updating Alexa Interaction Model based on Jovo Language Model in ' + highlight('/models');
                }
                return new listr([
                    {
                        title: 'Creating Alexa project files',
                        enabled: () => !hasAlexaSkill,
                        task: () => {
                            return new listr([
                                {
                                    title: 'skill.json',
                                    task: (ctx, task) => {
                                        return this.createAlexaSkill(ctx)
                                            .then(() => {
                                            if (ctx.invocation) {
                                                return project.updateInvocation(ctx.invocation, ctx.locales[0]);
                                            }
                                            return Promise.resolve();
                                        })
                                            .then(() => this.buildSkillAlexa(ctx.stage))
                                            .then(() => jovo_cli_core_1.Utils.wait(500));
                                    },
                                },
                            ]);
                        },
                    },
                    {
                        title: 'Updating Alexa project files',
                        enabled: () => hasAlexaSkill,
                        task: () => {
                            return new listr([
                                {
                                    title: 'skill.json',
                                    task: (ctx, task) => {
                                        return this.buildSkillAlexa(ctx.stage)
                                            .then(() => jovo_cli_core_1.Utils.wait(500));
                                    },
                                },
                            ]);
                        },
                    }, {
                        title: titleInteractionModel,
                        enabled: () => project.hasModelFiles(ctx.locales),
                        task: (ctx) => {
                            const buildLocalesTasks = [];
                            for (const locale of ctx.locales) {
                                buildLocalesTasks.push({
                                    title: locale,
                                    task: () => {
                                        return this.buildLanguageModelAlexa(locale, ctx.stage)
                                            .then(() => jovo_cli_core_1.Utils.wait(500));
                                    },
                                });
                            }
                            return new listr(buildLocalesTasks);
                        },
                    }
                ]);
            },
        });
        return buildPlatformTasks;
    }
    getGetTasks(ctx) {
        const alexaSkillPath = this.getPath();
        if (!fs.existsSync(alexaSkillPath)) {
            fs.mkdirSync(alexaSkillPath);
        }
        return [
            {
                title: 'Getting Alexa Skill project for ASK profile ' + highlight(ctx.askProfile),
                enabled: (ctx) => ctx.target === jovo_cli_core_1.TARGET_ALL || ctx.target === jovo_cli_core_1.TARGET_INFO,
                task: (ctx, task) => {
                    let p = Promise.resolve();
                    ctx.info = 'Info: ';
                    p = p
                        .then(() => ask.checkAsk())
                        .then(() => ask.askApiGetSkill(ctx, this.getSkillJsonPath()))
                        .then(() => this.setAlexaSkillId(ctx.skillId))
                        .then(() => ask.askApiGetAccountLinking(ctx))
                        .then((accountLinkingJson) => {
                        if (accountLinkingJson) {
                            fs.writeFile(this.getAccountLinkingPath(), accountLinkingJson, (err) => {
                                if (err) {
                                    return Promise.reject(err);
                                }
                                ctx.info += 'Account Linking Information saved to ' + this.getAccountLinkingPath();
                                return Promise.resolve();
                            });
                        }
                        else {
                            return Promise.resolve();
                        }
                    }).then(() => {
                        let info = 'Info: ';
                        const skillInfo = this.getSkillSimpleInformation();
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
                enabled: (ctx) => ctx.target === jovo_cli_core_1.TARGET_ALL ||
                    ctx.target === jovo_cli_core_1.TARGET_MODEL,
                task: (ctx) => {
                    const alexaModelPath = this.getModelsPath();
                    if (!fs.existsSync(alexaModelPath)) {
                        fs.mkdirSync(alexaModelPath);
                    }
                    const skillJson = this.getSkillJson();
                    let locales = Object.keys(skillJson.manifest.publishingInformation.locales);
                    if (ctx.locale && ctx.target === jovo_cli_core_1.TARGET_MODEL) {
                        locales = [ctx.locale];
                    }
                    const getLocaleSubtasks = [];
                    for (const locale of locales) {
                        getLocaleSubtasks.push({
                            title: locale,
                            task: (ctx) => {
                                return ask.askApiGetModel(ctx, this.getModelPath(locale), locale);
                            },
                        });
                    }
                    return new listr(getLocaleSubtasks);
                },
            },
        ];
    }
    getBuildReverseTasks(ctx) {
        const returnTasks = [];
        returnTasks.push({
            title: 'Reversing model files',
            task: (ctx) => {
                const reverseLocales = [];
                const locales = this.getLocales(ctx.locales);
                for (const locale of locales) {
                    reverseLocales.push({
                        title: locale.toString(),
                        task: () => {
                            const alexaModel = this.getModel(locale);
                            const alexaInteractionModel = new AlexaInteractionModel(alexaModel);
                            const jovoModel = alexaInteractionModel.reverse(alexaModel);
                            return project.saveModel(jovoModel, locale);
                        },
                    });
                }
                return new listr(reverseLocales);
            },
        });
        try {
            project.getConfigParameter(JovoCliPlatformAlexa.PLATFORM_KEY, ctx.stage);
        }
        catch (err) {
            returnTasks.push({
                title: 'Initializing Alexa Skill into app.json',
                task: (ctx) => {
                    return project.updatePlatformConfig(JovoCliPlatformAlexa.PLATFORM_KEY);
                },
            });
        }
        return returnTasks;
    }
    getDeployTasks(ctx, targets) {
        const returnTasks = [];
        const additionalTargetKeys = targets.map((target) => target.constructor.TARGET_KEY);
        try {
            ctx.skillId = this.getSkillId();
        }
        catch (error) {
            if (!ctx.target || ctx.target && !additionalTargetKeys.includes(ctx.target)) {
                console.log(`Couldn't find a platform. Please use init <platform> or get to retrieve platform files.`);
                return [];
            }
        }
        returnTasks.push({
            title: 'Deploying Alexa Skill ' + jovo_cli_core_1.Utils.printStage(ctx.stage),
            task: (ctx, task) => {
                const deployTasks = [
                    {
                        title: `Creating Alexa Skill project for ASK profile ${highlight(ctx.askProfile)}`,
                        enabled: (ctx) => _.isUndefined(ctx.skillId) &&
                            (!ctx.target || !!ctx.target && !additionalTargetKeys.includes(ctx.target)),
                        task: (ctx) => {
                            ctx.target = jovo_cli_core_1.TARGET_ALL;
                            return ask.checkAsk().then(() => {
                                return ask.askApiCreateSkill(ctx, this.getSkillJsonPath()).then((skillId) => {
                                    ctx.skillId = skillId;
                                    ctx.newSkill = true;
                                    return this.setAlexaSkillId(skillId);
                                }).then(() => ask.getSkillStatus(ctx)).then(() => {
                                    let info = 'Info: ';
                                    const skillInfo = this.getSkillInformation();
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
                            (ctx.target === jovo_cli_core_1.TARGET_ALL || ctx.target === jovo_cli_core_1.TARGET_INFO),
                        task: (ctx, task) => {
                            return ask.askApiUpdateSkill(ctx, this.getSkillJsonPath()).then(() => ask.getSkillStatus(ctx)).then(() => {
                                let info = 'Info: ';
                                const skillInfo = this.getSkillInformation();
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
                        enabled: (ctx) => ctx.target === jovo_cli_core_1.TARGET_ALL ||
                            ctx.target === jovo_cli_core_1.TARGET_MODEL,
                        task: (ctx) => {
                            const deployLocaleTasks = [];
                            for (const locale of this.getLocales()) {
                                deployLocaleTasks.push({
                                    title: locale,
                                    task: (ctx) => {
                                        const config = _.cloneDeep(ctx);
                                        config.locales = [locale];
                                        return ask.askApiUpdateModel(config, this.getModelPath(locale), locale).then(() => ask.getModelStatus(config));
                                    },
                                });
                            }
                            return new listr(deployLocaleTasks);
                        },
                    }
                ];
                if (!ctx.newSkill) {
                    targets.forEach((target) => {
                        deployTasks.push.apply(deployTasks, target.execute(ctx, project));
                    });
                }
                deployTasks.push({
                    title: 'Enabling skill for testing',
                    enabled: (ctx) => !_.isUndefined(ctx.newSkill),
                    task: (ctx) => {
                        return ask.askApiEnableSkill(ctx);
                    },
                });
                return new listr(deployTasks);
            },
        });
        return returnTasks;
    }
    getModelsPath() {
        return path.join(this.getPath(), 'models');
    }
    getModelPath(locale) {
        return path.join(this.getModelsPath(), locale + '.json');
    }
    getLocales(locale) {
        try {
            if (locale) {
                if (Array.isArray(locale)) {
                    return locale;
                }
                else {
                    return [locale];
                }
            }
            const files = fs.readdirSync(this.getModelsPath());
            if (files.length === 0) {
                return [project.DEFAULT_LOCALE];
            }
            const locales = [];
            for (const file of files) {
                if (file.length === 10) {
                    locales.push(file.substr(0, 5));
                }
            }
            return locales;
        }
        catch (err) {
            throw err;
        }
    }
    getAccountLinkingPath() {
        return path.join(this.getPath(), 'accountLinking.json');
    }
    getSkillId() {
        try {
            const skillId = _.get(this.getAskConfig(), 'deploy_settings.default.skill_id');
            if (skillId && skillId.length > 0) {
                return skillId;
            }
        }
        catch (err) {
            throw err;
        }
    }
    getSkillJsonPath() {
        return path.join(this.getPath(), 'skill.json');
    }
    getAskConfigFolderPath() {
        return path.join(this.getPath(), '.ask');
    }
    getAskConfigPath() {
        return path.join(this.getAskConfigFolderPath(), 'config');
    }
    getSkillJson() {
        try {
            return require(this.getSkillJsonPath());
        }
        catch (error) {
            throw error;
        }
    }
    getAskConfig() {
        try {
            return JSON.parse(fs.readFileSync(this.getAskConfigPath(), 'utf8'));
        }
        catch (error) {
            throw error;
        }
    }
    getModel(locale) {
        try {
            return require(this.getModelPath(locale));
        }
        catch (error) {
            throw error;
        }
    }
    createEmptySkillJson(skillName, locales) {
        const skillJson = {
            'manifest': {
                'publishingInformation': {
                    'locales': {},
                    'isAvailableWorldwide': true,
                    'testingInstructions': 'Sample Testing Instructions.',
                    'category': 'EDUCATION_AND_REFERENCE',
                    'distributionCountries': [],
                },
                'apis': {},
                'manifestVersion': '1.0',
            },
        };
        if (locales) {
            for (const locale of locales) {
                if (locale.length === 2) {
                    try {
                        const appJson = project.getConfig();
                        if (!_.get(appJson, `alexaSkill.nlu.lang.${locale}`)) {
                            throw new Error();
                        }
                        const sublocales = _.get(appJson, `alexaSkill.nlu.lang.${locale}`);
                        for (const sublocale of sublocales) {
                            _.set(skillJson, `manifest.publishingInformation.locales.${sublocale}`, {
                                'summary': 'Sample Short Description',
                                'examplePhrases': [
                                    'Alexa open hello world',
                                ],
                                'name': skillName,
                                'description': 'Sample Full Description',
                            });
                        }
                    }
                    catch (error) {
                        throw new Error('Could not retrieve locales mapping for language ' + locale);
                    }
                }
                else {
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
        }
        return skillJson;
    }
    createEmptyModelJson() {
        return {
            'interactionModel': {
                'languageModel': {},
            },
        };
    }
    createAlexaSkill(ctx) {
        return new Promise((resolve, reject) => {
            const alexaSkillPath = this.getPath();
            if (!fs.existsSync(alexaSkillPath)) {
                fs.mkdirSync(alexaSkillPath);
            }
            const alexaModelPath = this.getModelsPath();
            if (!fs.existsSync(alexaModelPath)) {
                fs.mkdirSync(alexaModelPath);
            }
            const askConfigPath = this.getAskConfigFolderPath();
            if (!fs.existsSync(askConfigPath)) {
                fs.mkdirSync(askConfigPath);
            }
            const skillJson = this.createEmptySkillJson(project.getProjectName(), ctx.locales);
            _.set(skillJson, 'manifest.apis.custom', {});
            fs.writeFile(this.getSkillJsonPath(), JSON.stringify(skillJson, null, '\t'), (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                const askConfig = {
                    deploy_settings: {
                        default: {
                            skill_id: '',
                            was_cloned: false,
                        },
                    },
                };
                fs.writeFile(this.getAskConfigPath(), JSON.stringify(askConfig, null, '\t'), (err) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve();
                });
            });
        });
    }
    buildLanguageModelAlexa(locale, stage) {
        return new Promise((resolve, reject) => {
            try {
                let alexaModel;
                try {
                    alexaModel = this.getModel(locale);
                }
                catch (err) {
                    alexaModel = this.createEmptyModelJson();
                }
                const aim = new AlexaInteractionModel(alexaModel);
                aim.transform(locale, stage, this.getModelPath.bind(this));
                resolve();
            }
            catch (error) {
                reject(error);
            }
        });
    }
    buildSkillAlexa(stage) {
        return new Promise((resolve, reject) => {
            try {
                const config = project.getConfig(stage);
                const skillJson = this.getSkillJson();
                if (_.get(config, 'endpoint')) {
                    if (_.isString(_.get(config, 'endpoint'))) {
                        _.set(skillJson, 'manifest.apis.custom.endpoint', {
                            sslCertificateType: 'Wildcard',
                            uri: project.getEndpointFromConfig(_.get(config, 'endpoint')),
                        });
                    }
                    else if (_.isObject(_.get(config, 'endpoint')) && _.get(config, 'endpoint.alexaSkill')) {
                        _.set(skillJson, 'manifest.apis.custom.endpoint', project.getEndpointFromConfig(_.get(config, 'endpoint.alexaSkill')));
                    }
                }
                else {
                    const globalConfig = project.getConfig();
                    const stageConfig = _.get(project.getConfig(), `stages.${stage}`);
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
                        }
                        else {
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
                    if (typeof project.getConfigParameter('alexaSkill.skillId', stage) !== 'undefined') {
                        this.setAlexaSkillId(project.getConfigParameter('alexaSkill.skillId', stage))
                            .then(() => resolve());
                    }
                    else {
                        resolve();
                    }
                });
            }
            catch (err) {
                return reject(err);
            }
        });
    }
    getSkillIdPromise() {
        return new Promise((resolve) => {
            fs.readFile(this.getAskConfigPath(), 'utf-8', (err, data) => {
                if (err) {
                    resolve();
                    return;
                }
                resolve(_.get(JSON.parse(data), 'deploy_settings.default.skill_id'));
            });
        });
    }
    getSkillInformation() {
        const skillJson = this.getSkillJson();
        const info = {
            name: '',
            invocationName: '',
            skillId: this.getSkillId(),
            endpoint: skillJson.manifest.apis.custom.endpoint.uri
        };
        const locales = skillJson.manifest.publishingInformation.locales;
        for (const locale of Object.keys(locales)) {
            info.name += locales[locale].name + ' (' + locale + ') ';
            info.invocationName += this.getInvocationName(locale) + ' (' + locale + ') ';
        }
        return info;
    }
    getSkillSimpleInformation() {
        const skillJson = this.getSkillJson();
        const info = {
            name: '',
            skillId: this.getSkillId(),
            endpoint: _.get(skillJson, 'manifest.apis.custom.endpoint.uri', ''),
        };
        const locales = skillJson.manifest.publishingInformation.locales;
        for (const locale of Object.keys(locales)) {
            info.name += locales[locale].name + ' (' + locale + ') ';
        }
        return info;
    }
    isLambdaEndpoint() {
        const skillJson = this.getSkillJson();
        return _.startsWith(skillJson.manifest.apis.custom.endpoint.uri, 'arn');
    }
    getInvocationName(locale) {
        return this.getModel(locale).interactionModel.languageModel.invocationName;
    }
    setAlexaSkillId(skillId) {
        return new Promise((resolve, reject) => {
            if (!fs.existsSync(this.getAskConfigFolderPath())) {
                fs.mkdirSync(this.getAskConfigFolderPath());
            }
            fs.readFile(this.getAskConfigPath(), 'utf-8', (err, data) => {
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
                }
                else {
                    askConfig = JSON.parse(data);
                }
                _.set(askConfig, 'deploy_settings.default.skill_id', skillId);
                fs.writeFile(this.getAskConfigPath(), JSON.stringify(askConfig, null, '\t'), (err) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve(skillId);
                });
            });
        });
    }
}
JovoCliPlatformAlexa.PLATFORM_KEY = 'alexaSkill';
exports.JovoCliPlatformAlexa = JovoCliPlatformAlexa;
//# sourceMappingURL=Platform.js.map