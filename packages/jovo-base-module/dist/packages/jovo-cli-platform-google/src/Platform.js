'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const DialogFlowUtil = require("./DialogflowUtil");
const GoogleActionUtil = require("./GoogleActionUtil");
const BUILTIN_PREFIX = '@sys.';
const path_1 = require("path");
const _ = require('lodash');
const fs = require("fs");
const listr = require("listr");
const highlight = require('chalk').white.bold;
const jovo_cli_core_1 = require("jovo-cli-core");
const project = require('jovo-cli-core').getProject();
const DEFAULT_INTENT = {
    'auto': true,
    'contexts': [],
    'responses': [
        {
            'resetContexts': false,
            'affectedContexts': [],
            'parameters': [],
            'defaultResponsePlatforms': {},
            'speech': [],
        },
    ],
    'priority': 500000,
    'webhookUsed': false,
    'webhookForSlotFilling': false,
    'fallbackIntent': false,
    'events': [],
};
const DEFAULT_ENTITY = {
    'isOverridable': true,
    'isEnum': false,
    'automatedExpansion': false,
};
class JovoCliPlatformGoogle extends jovo_cli_core_1.JovoCliPlatform {
    constructor() {
        super();
    }
    getPlatformConfigIds(project, argOptions) {
        try {
            let projectId;
            if (argOptions && argOptions.hasOwnProperty('project-id') && argOptions['project-id']) {
                projectId = argOptions['skill-id'];
            }
            else {
                projectId = project.getConfigParameter('googleAction.dialogflow.projectId', argOptions && argOptions.stage);
            }
            const returnValue = {};
            if (projectId) {
                returnValue.projectId = projectId;
            }
            return returnValue;
        }
        catch (error) {
            return {};
        }
    }
    getPlatformConfigValues(project, argOptions) {
        return {};
    }
    getExistingProjects(config) {
        throw new Error('Method "getExistingProjects" is not implemented');
    }
    getAdditionalCliOptions(command, vorpalCommand) {
        if (['get', 'deploy'].includes(command)) {
            vorpalCommand
                .option('--project-id <projectId>', 'Google Cloud Project ID');
        }
    }
    validateAdditionalCliOptions(command, args) {
        return true;
    }
    hasPlatform() {
        try {
            require(DialogFlowUtil.getAgentJsonPath());
            return true;
        }
        catch (err) {
            return false;
        }
    }
    getLocales(locale) {
        const agentJson = DialogFlowUtil.getAgentJson();
        let supportedLanguages = [agentJson.language];
        if (agentJson.supportedLanguages) {
            supportedLanguages = supportedLanguages.concat(agentJson.supportedLanguages);
        }
        return supportedLanguages;
    }
    setPlatformDefaults(model) {
        _.set(model, 'dialogflow.intents', DialogFlowUtil.getDefaultIntents());
        return model;
    }
    addPlatfromToConfig(config) {
        if (!config.googleAction) {
            _.extend(config, {
                googleAction: {
                    nlu: {
                        name: 'dialogflow',
                    },
                },
            });
        }
        return config;
    }
    getBuildTasks(ctx) {
        const returnTasks = [];
        const googleActionPath = GoogleActionUtil.getPath();
        if (!fs.existsSync(googleActionPath)) {
            fs.mkdirSync(googleActionPath);
        }
        const dialogFlowPath = DialogFlowUtil.getPath();
        if (!fs.existsSync(dialogFlowPath)) {
            fs.mkdirSync(dialogFlowPath);
        }
        const hasGoogleActionDialogflow = this.hasPlatform();
        let title = 'Creating /platforms/googleAction/dialogflow ' + jovo_cli_core_1.Utils.printStage(ctx.stage);
        let titleAgentJson = 'Creating Dialogflow Agent';
        let titleInteractionModel = 'Creating Language Model based on Jovo Language Model in ' + highlight('/models');
        if (hasGoogleActionDialogflow) {
            title = 'Updating /platforms/googleAction/dialogflow ' + jovo_cli_core_1.Utils.printStage(ctx.stage);
            titleAgentJson = 'Updating Dialogflow Agent';
            titleInteractionModel = 'Updating Dialogflow Language Model based on Jovo Language Model in ' + highlight('/models');
        }
        returnTasks.push({
            title,
            task: () => {
                const buildSubTasks = [{
                        title: titleAgentJson,
                        task: (ctx) => {
                            return new listr([
                                {
                                    title: 'agent.json',
                                    task: () => {
                                        return Promise.resolve();
                                    },
                                },
                                {
                                    title: 'package.json',
                                    task: (ctx, task) => {
                                        return DialogFlowUtil.buildDialogFlowAgent(ctx)
                                            .then(() => jovo_cli_core_1.Utils.wait(500));
                                    },
                                },
                            ]);
                        },
                    }, {
                        title: titleInteractionModel,
                        task: (ctx) => {
                            const buildLocalesTasks = [];
                            if (fs.existsSync(DialogFlowUtil.getIntentsFolderPath())) {
                                fs.readdirSync(DialogFlowUtil.getIntentsFolderPath()).forEach((file, index) => {
                                    const curPath = path_1.join(DialogFlowUtil.getIntentsFolderPath(), file);
                                    fs.unlinkSync(curPath);
                                });
                            }
                            if (fs.existsSync(DialogFlowUtil.getEntitiesFolderPath())) {
                                fs.readdirSync(DialogFlowUtil.getEntitiesFolderPath()).forEach((file, index) => {
                                    const curPath = path_1.join(DialogFlowUtil.getEntitiesFolderPath(), file);
                                    fs.unlinkSync(curPath);
                                });
                            }
                            if (ctx.locales) {
                                for (const locale of ctx.locales) {
                                    buildLocalesTasks.push({
                                        title: locale,
                                        task: () => {
                                            this.transform(locale, ctx.stage);
                                            return Promise.resolve()
                                                .then(() => jovo_cli_core_1.Utils.wait(500));
                                        },
                                    });
                                }
                            }
                            return new listr(buildLocalesTasks);
                        },
                    }];
                return new listr(buildSubTasks);
            },
        });
        return returnTasks;
    }
    getGetTasks(ctx) {
        const googleActionPath = GoogleActionUtil.getPath();
        if (!fs.existsSync(googleActionPath)) {
            fs.mkdirSync(googleActionPath);
        }
        const dialogflowPath = DialogFlowUtil.getPath();
        if (!fs.existsSync(dialogflowPath)) {
            fs.mkdirSync(dialogflowPath);
        }
        return [
            {
                title: 'Getting Dialogflow Agent files and saving to /platforms/googleAction/dialogflow',
                task: (ctx, task) => {
                    const keyFile = project.getConfigParameter('googleAction.dialogflow.keyFile', ctx.stage);
                    let p = Promise.resolve();
                    if (keyFile) {
                        if (!fs.existsSync(process.cwd() + path_1.sep + keyFile)) {
                            throw new Error(`Keyfile ${process.cwd() + path_1.sep + keyFile} does not exist.`);
                        }
                        ctx.keyFile = process.cwd() + path_1.sep + keyFile;
                        p = p.then(() => DialogFlowUtil.v2.activateServiceAccount(ctx));
                    }
                    p = p.then(() => DialogFlowUtil.getAgentFiles(ctx));
                    return p;
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
                const supportedLanguages = this.getLocales();
                for (let locale of supportedLanguages) {
                    if (locale.length === 5) {
                        locale = locale.substr(0, 2) + '-' + locale.substr(3).toUpperCase();
                    }
                    reverseLocales.push({
                        title: locale,
                        task: () => {
                            const jovoModel = this.reverse(locale);
                            return project.saveModel(jovoModel, locale);
                        },
                    });
                }
                return new listr(reverseLocales);
            },
        });
        try {
            project.getConfigParameter('googleAction', ctx.stage);
        }
        catch (err) {
            returnTasks.push({
                title: 'Initializing GoogleAction into app.json',
                task: (ctx) => {
                    return project.updatePlatformConfig(JovoCliPlatformGoogle.PLATFORM_KEY);
                },
            });
        }
        return returnTasks;
    }
    getDeployTasks(ctx, targets) {
        const globalConfig = project.getConfig();
        const stageConfig = _.get(project.getConfig(), `stages.${ctx.stage}`);
        const returnTasks = [];
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
        returnTasks.push({
            title: 'Deploying Google Action ' + jovo_cli_core_1.Utils.printStage(ctx.stage),
            task: (ctx, task) => {
                const deployTasks = [
                    {
                        title: 'Creating file /googleAction/dialogflow_agent.zip',
                        task: (ctx, task) => {
                            return DialogFlowUtil.zip().then(() => {
                                let info = 'Info: ';
                                info += `Language model: `;
                                for (const locale of project.getLocales()) {
                                    info += `${locale} `;
                                }
                                info += '\n';
                                info += `Fulfillment Endpoint: ${DialogFlowUtil.getAgentJson().webhook.url}`;
                                task.skip(info);
                            });
                        },
                    },
                    {
                        title: `Uploading and restoring agent for project ${highlight(ctx.projectId)}`,
                        enabled: (ctx) => !!ctx.projectId,
                        task: (ctx, task) => {
                            ctx.pathToZip = GoogleActionUtil.getPath() + '/dialogflow_agent.zip';
                            const keyFile = project.getConfigParameter('googleAction.dialogflow.keyFile', ctx.stage);
                            let p = Promise.resolve();
                            if (keyFile) {
                                if (!fs.existsSync(process.cwd() + path_1.sep + keyFile)) {
                                    throw new Error(`Keyfile ${process.cwd() + path_1.sep + keyFile} does not exist.`);
                                }
                                ctx.keyFile = process.cwd() + path_1.sep + keyFile;
                                p = p.then(() => DialogFlowUtil.v2.activateServiceAccount(ctx));
                            }
                            p = p.then(() => DialogFlowUtil.v2.checkGcloud())
                                .then(() => DialogFlowUtil.v2.restoreAgent(ctx));
                            return p;
                        },
                    },
                    {
                        title: 'Training started',
                        enabled: (ctx) => !!ctx.projectId,
                        task: (ctx, task) => {
                            return DialogFlowUtil.v2.trainAgent(ctx);
                        },
                    }
                ];
                targets.forEach((target) => {
                    deployTasks.push.apply(deployTasks, target.execute(ctx, project));
                });
                return new listr(deployTasks);
            },
        });
        return returnTasks;
    }
    static skipDefaultIntentProps(jovoIntent, dialogFlowIntent, locale) {
        if (_.get(dialogFlowIntent, 'auto') !== _.get(DEFAULT_INTENT, 'auto')) {
            _.set(jovoIntent, 'dialogflow.auto', _.get(dialogFlowIntent, 'auto'));
        }
        if (_.difference(_.get(dialogFlowIntent, 'contexts'), _.get(DEFAULT_INTENT, 'contexts')).length > 0) {
            _.set(jovoIntent, 'dialogflow.contexts', _.get(dialogFlowIntent, 'contexts'));
        }
        if (_.get(dialogFlowIntent, 'priority') !== _.get(DEFAULT_INTENT, 'priority')) {
            _.set(jovoIntent, 'dialogflow.priority', _.get(dialogFlowIntent, 'priority'));
        }
        if (_.get(dialogFlowIntent, 'webhookUsed') !== _.get(DEFAULT_INTENT, 'webhookUsed')) {
            _.set(jovoIntent, 'dialogflow.webhookUsed', _.get(dialogFlowIntent, 'webhookUsed'));
        }
        if (_.get(dialogFlowIntent, 'webhookForSlotFilling') !== _.get(DEFAULT_INTENT, 'webhookForSlotFilling')) {
            _.set(jovoIntent, 'dialogflow.webhookForSlotFilling', _.get(dialogFlowIntent, 'webhookForSlotFilling'));
        }
        if (_.get(dialogFlowIntent, 'fallbackIntent') !== _.get(DEFAULT_INTENT, 'fallbackIntent')) {
            _.set(jovoIntent, 'dialogflow.fallbackIntent', _.get(dialogFlowIntent, 'fallbackIntent'));
        }
        if (_.difference(_.get(dialogFlowIntent, 'events'), _.get(DEFAULT_INTENT, 'events')).length > 0) {
            _.set(jovoIntent, 'dialogflow.events', _.get(dialogFlowIntent, 'events'));
        }
        if (!_.isEqual(_.get(dialogFlowIntent, 'responses'), _.get(DEFAULT_INTENT, 'responses'))) {
            if (!_.isEqual(_.get(dialogFlowIntent, 'responses[0].resetContexts'), _.get(DEFAULT_INTENT, 'responses[0].resetContexts'))) {
                _.set(jovoIntent, 'dialogflow.responses[0].resetContexts', _.get(dialogFlowIntent, 'responses[0].resetContexts'));
            }
            if (!_.isEqual(_.get(dialogFlowIntent, 'responses[0].affectedContexts'), _.get(DEFAULT_INTENT, 'responses[0].affectedContexts'))) {
                _.set(jovoIntent, 'dialogflow.responses[0].affectedContexts', _.get(dialogFlowIntent, 'responses[0].affectedContexts'));
            }
            if (!_.isEqual(_.get(dialogFlowIntent, 'responses[0].defaultResponsePlatforms'), _.get(DEFAULT_INTENT, 'responses[0].defaultResponsePlatforms'))) {
                _.set(jovoIntent, 'dialogflow.responses[0].defaultResponsePlatforms', _.get(dialogFlowIntent, 'responses[0].defaultResponsePlatforms'));
            }
            if (!_.isEqual(_.get(dialogFlowIntent, 'responses[0].messages'), _.get(DEFAULT_INTENT, 'responses[0].messages'))) {
                for (const message of _.get(dialogFlowIntent, 'responses[0].messages')) {
                    jovo_cli_core_1.Utils.log(dialogFlowIntent.name + '--- ' + _.get(message, 'lang') + '=== ' + locale);
                    if (_.get(message, 'lang') === locale) {
                        const jovoIntentDialogFlowMessages = _.get(jovoIntent, 'dialogflow.responses[0].messages', []);
                        if (message.speech.length > 0) {
                            jovoIntentDialogFlowMessages.push(message);
                            jovo_cli_core_1.Utils.log(jovoIntentDialogFlowMessages);
                            _.set(jovoIntent, 'dialogflow.responses[0].messages', jovoIntentDialogFlowMessages);
                        }
                    }
                }
            }
            if (!_.isEqual(_.get(dialogFlowIntent, 'responses[0].speech'), _.get(DEFAULT_INTENT, 'responses[0].speech'))) {
                _.set(jovoIntent, 'dialogflow.responses[0].speech', _.get(dialogFlowIntent, 'responses[0].speech'));
            }
        }
        return jovoIntent;
    }
    static skipDefaultEntityProps(jovoInput, dialogflowEntity) {
        if (_.get(dialogflowEntity, 'isOverridable') !== _.get(DEFAULT_ENTITY, 'isOverridable')) {
            _.set(jovoInput, 'dialogflow.isOverridable', _.get(dialogflowEntity, 'isOverridable'));
        }
        if (_.get(dialogflowEntity, 'isEnum') !== _.get(DEFAULT_ENTITY, 'isEnum')) {
            _.set(jovoInput, 'dialogflow.isEnum', _.get(dialogflowEntity, 'isEnum'));
        }
        if (_.get(dialogflowEntity, 'automatedExpansion') !== _.get(DEFAULT_ENTITY, 'automatedExpansion')) {
            _.set(jovoInput, 'dialogflow.automatedExpansion', _.get(dialogflowEntity, 'automatedExpansion'));
        }
        return jovoInput;
    }
    reverse(locale) {
        const jovoModel = {
            invocation: '',
            intents: [],
            inputTypes: [],
        };
        const intentFiles = fs.readdirSync(DialogFlowUtil.getIntentsFolderPath());
        for (const file of intentFiles) {
            if (file.indexOf('usersays') > -1) {
                continue;
            }
            const dialogFlowIntent = require(DialogFlowUtil.getIntentsFolderPath() + path_1.sep + file);
            const jovoIntent = {
                name: dialogFlowIntent.name,
                phrases: [],
            };
            JovoCliPlatformGoogle.skipDefaultIntentProps(jovoIntent, dialogFlowIntent, locale);
            if (dialogFlowIntent.fallbackIntent === true) {
                const fallbackIntent = jovoIntent.dialogflow;
                fallbackIntent.name = dialogFlowIntent.name;
                _.set(jovoModel, 'dialogflow.intents', [fallbackIntent]);
                continue;
            }
            if (_.get(dialogFlowIntent, 'events[0].name') === 'WELCOME') {
                const welcomeIntent = jovoIntent.dialogflow;
                welcomeIntent.name = dialogFlowIntent.name;
                if (!_.get(jovoModel, 'dialogflow.intents')) {
                    _.set(jovoModel, 'dialogflow.intents', [welcomeIntent]);
                }
                else {
                    jovoModel.dialogflow.intents.push(welcomeIntent);
                }
                continue;
            }
            const inputs = [];
            if (dialogFlowIntent.responses) {
                for (const response of dialogFlowIntent.responses) {
                    for (const parameter of _.get(response, 'parameters', [])) {
                        const input = {
                            name: parameter.name,
                        };
                        if (parameter.dataType) {
                            if (_.startsWith(parameter.dataType, '@sys.')) {
                                input.type = {
                                    dialogflow: parameter.dataType,
                                };
                            }
                            else {
                                input.type = parameter.dataType.substr(1);
                            }
                            inputs.push(input);
                        }
                    }
                }
            }
            if (inputs.length > 0) {
                jovoIntent.inputs = inputs;
            }
            const userSaysFilePath = DialogFlowUtil.getIntentsFolderPath() + path_1.sep + dialogFlowIntent.name + '_usersays_' + locale + '.json';
            if (fs.existsSync(userSaysFilePath)) {
                const userSays = require(userSaysFilePath);
                for (const us of userSays) {
                    let phrase = '';
                    for (const data of us.data) {
                        phrase += data.alias ? '{' + data.alias + '}' : data.text;
                        if (data.text !== data.alias) {
                            if (jovoIntent.inputs) {
                                for (const input of jovoIntent.inputs) {
                                    if (input.name === data.alias) {
                                        input.text = data.text;
                                    }
                                }
                            }
                        }
                    }
                    jovoIntent.phrases.push(phrase);
                }
            }
            jovoModel.intents.push(jovoIntent);
        }
        if (fs.existsSync(DialogFlowUtil.getEntitiesFolderPath())) {
            const entitiesFiles = fs.readdirSync(DialogFlowUtil.getEntitiesFolderPath());
            for (const file of entitiesFiles) {
                if (file.indexOf('entries') > -1) {
                    continue;
                }
                const dialogFlowEntity = require(DialogFlowUtil.getEntitiesFolderPath() + path_1.sep + file);
                const jovoInput = {
                    name: dialogFlowEntity.name,
                };
                JovoCliPlatformGoogle.skipDefaultEntityProps(jovoInput, dialogFlowEntity);
                const entriesFilePath = DialogFlowUtil.getEntitiesFolderPath() + path_1.sep + dialogFlowEntity.name + '_entries_' + locale + '.json';
                if (fs.existsSync(entriesFilePath)) {
                    const values = [];
                    const entries = require(entriesFilePath);
                    for (const entry of entries) {
                        const value = {
                            value: entry.value,
                            synonyms: [],
                        };
                        for (const synonym of entry.synonyms) {
                            if (synonym === entry.value) {
                                continue;
                            }
                            value.synonyms.push(synonym);
                        }
                        values.push(value);
                    }
                    if (values.length > 0) {
                        jovoInput.values = values;
                    }
                }
                jovoModel.inputTypes.push(jovoInput);
            }
        }
        if (jovoModel.inputTypes.length === 0) {
            delete jovoModel.inputTypes;
        }
        return jovoModel;
    }
    transform(locale, stage) {
        if (!fs.existsSync(DialogFlowUtil.getPath())) {
            fs.mkdirSync(DialogFlowUtil.getPath());
        }
        if (!fs.existsSync(DialogFlowUtil.getIntentsFolderPath())) {
            fs.mkdirSync(DialogFlowUtil.getIntentsFolderPath());
        }
        let outputLocale = locale.toLowerCase();
        if (['pt-br', 'zh-cn', 'zh-hk', 'zh-tw'].indexOf(outputLocale) === -1) {
            const primLanguage = project.getLocales().filter((lang) => {
                return locale.substr(0, 2) === lang.substr(0, 2);
            });
            if (primLanguage.length === 1) {
                outputLocale = locale.substr(0, 2);
            }
        }
        let model;
        try {
            model = project.getModel(locale);
        }
        catch (e) {
            return;
        }
        const concatArrays = function customizer(objValue, srcValue) {
            if (_.isArray(objValue)) {
                return objValue.concat(srcValue);
            }
        };
        if (project.getConfigParameter(`languageModel.${locale}`, stage)) {
            model = _.mergeWith(model, project.getConfigParameter(`languageModel.${locale}`, stage), concatArrays);
        }
        if (project.getConfigParameter(`googleAction.dialogflow.languageModel.${locale}`, stage)) {
            model = _.mergeWith(model, project.getConfigParameter(`googleAction.dialogflow.languageModel.${locale}`, stage), concatArrays);
        }
        for (const intent of model.intents) {
            const intentPath = DialogFlowUtil.getIntentsFolderPath() + intent.name + '.json';
            const dfIntentObj = {
                'name': intent.name,
                'auto': true,
                'webhookUsed': true,
            };
            if (intent.inputs) {
                dfIntentObj.responses = [{
                        parameters: [],
                    }];
                for (const input of intent.inputs) {
                    let parameterObj = {
                        isList: false,
                        name: input.name,
                        value: '$' + input.name,
                        dataType: ''
                    };
                    if (typeof input.type === 'object') {
                        if (input.type.dialogflow) {
                            if (_.startsWith(input.type.dialogflow, BUILTIN_PREFIX)) {
                                parameterObj.dataType = input.type.dialogflow;
                            }
                            else {
                                input.type = input.type.dialogflow;
                            }
                        }
                        else {
                            throw new Error('Please add a dialogflow property for input "' + input.name + '"');
                        }
                    }
                    if (parameterObj.dataType === '') {
                        if (!input.type) {
                            throw new Error('Invalid input type in intent "' + intent.name + '"');
                        }
                        parameterObj.dataType = input.type;
                        if (!model.inputTypes) {
                            throw new Error('Input type "' + parameterObj.dataType + '" must be defined in inputTypes');
                        }
                        const matchedInputTypes = model.inputTypes.filter((item) => {
                            return item.name === parameterObj.dataType;
                        });
                        parameterObj.dataType = '@' + parameterObj.dataType;
                        if (matchedInputTypes.length === 0) {
                            throw new Error('Input type "' + parameterObj.dataType + '" must be defined in inputTypes');
                        }
                        if (!fs.existsSync(DialogFlowUtil.getEntitiesFolderPath())) {
                            fs.mkdirSync(DialogFlowUtil.getEntitiesFolderPath());
                        }
                        for (const matchedInputType of matchedInputTypes) {
                            let dfEntityObj = {
                                name: matchedInputType.name,
                                isOverridable: true,
                                isEnum: false,
                                automatedExpansion: false,
                            };
                            if (matchedInputType.dialogflow) {
                                if (typeof matchedInputType.dialogflow === 'string') {
                                    dfEntityObj.name = matchedInputType.dialogflow;
                                }
                                else {
                                    dfEntityObj = _.merge(dfEntityObj, matchedInputType.dialogflow);
                                }
                            }
                            const entityFilePath = DialogFlowUtil.getEntitiesFolderPath() + matchedInputType.name + '.json';
                            fs.writeFileSync(entityFilePath, JSON.stringify(dfEntityObj, null, '\t'));
                            if (matchedInputType.values && matchedInputType.values.length > 0) {
                                const entityValues = [];
                                for (const value of matchedInputType.values) {
                                    const dfEntityValueObj = {
                                        value: value.value,
                                        synonyms: [value.value.replace(/[^0-9A-Za-zÀ-ÿ-_ ]/gi, '')],
                                    };
                                    if (value.synonyms) {
                                        for (let i = 0; i < value.synonyms.length; i++) {
                                            value.synonyms[i] = value.synonyms[i].replace(/[^0-9A-Za-zÀ-ÿ-_ ]/gi, '');
                                        }
                                        dfEntityValueObj.synonyms =
                                            dfEntityValueObj.synonyms.concat(value.synonyms);
                                    }
                                    entityValues.push(dfEntityValueObj);
                                }
                                const entityEntriesFilePath = DialogFlowUtil.getEntitiesFolderPath() + matchedInputType.name + '_entries_' + outputLocale + '.json';
                                fs.writeFileSync(entityEntriesFilePath, JSON.stringify(entityValues, null, '\t'));
                            }
                        }
                    }
                    if (input.dialogflow) {
                        parameterObj = _.merge(parameterObj, input.dialogflow);
                    }
                    dfIntentObj.responses[0].parameters.push(parameterObj);
                }
            }
            if (_.get(intent, 'dialogflow')) {
                _.merge(dfIntentObj, intent.dialogflow);
            }
            fs.writeFileSync(intentPath, JSON.stringify(dfIntentObj, null, '\t'));
            const dialogFlowIntentUserSays = [];
            const re = /{(.*?)}/g;
            const phrases = intent.phrases || [];
            for (const phrase of phrases) {
                let m;
                let data = [];
                let pos = 0;
                while (true) {
                    m = re.exec(phrase);
                    if (!m) {
                        break;
                    }
                    const text = phrase.substr(pos, m.index - pos);
                    const entity = phrase.substr(m.index + 1, m[1].length);
                    pos = m.index + 1 + m[1].length + 1;
                    const dataTextObj = {
                        text,
                        userDefined: false,
                    };
                    if (text.length > 0) {
                        data.push(dataTextObj);
                    }
                    const dataEntityObj = {
                        text: entity,
                        userDefined: true,
                    };
                    if (intent.inputs) {
                        for (const input of intent.inputs) {
                            if (input.name === entity && input.text) {
                                dataEntityObj.text = input.text;
                            }
                        }
                    }
                    if (_.get(dfIntentObj, 'responses[0].parameters')) {
                        dfIntentObj.responses[0].parameters.forEach((item) => {
                            if (item.name === entity) {
                                dataEntityObj.alias = item.name;
                                dataEntityObj.meta = item.dataType;
                            }
                        });
                    }
                    data.push(dataEntityObj);
                }
                if (pos < phrase.length) {
                    data.push({
                        text: phrase.substr(pos),
                        userDefined: false,
                    });
                }
                if (data.length === 0) {
                    data = [
                        {
                            text: phrase,
                            userDefined: false,
                        },
                    ];
                }
                dialogFlowIntentUserSays.push({
                    data,
                    isTemplate: false,
                    count: 0,
                });
            }
            if (dialogFlowIntentUserSays.length > 0) {
                const intentUserSaysFilePath = DialogFlowUtil.getIntentsFolderPath() + intent.name + '_usersays_' + outputLocale + '.json';
                fs.writeFileSync(intentUserSaysFilePath, JSON.stringify(dialogFlowIntentUserSays, null, '\t'));
            }
        }
        if (_.get(model, 'dialogflow.intents')) {
            for (const modelDialogflowIntent of _.get(model, 'dialogflow.intents')) {
                const path = DialogFlowUtil.getIntentsFolderPath() + path_1.sep + modelDialogflowIntent.name + '.json';
                fs.writeFileSync(path, JSON.stringify(modelDialogflowIntent, null, '\t'));
                if (modelDialogflowIntent.userSays) {
                    const pathUserSays = DialogFlowUtil.getIntentsFolderPath() + path_1.sep + modelDialogflowIntent.name + '_usersays_' + outputLocale + '.json';
                    fs.writeFileSync(pathUserSays, JSON.stringify(modelDialogflowIntent.userSays, null, '\t'));
                    delete modelDialogflowIntent.userSays;
                }
            }
        }
        if (_.get(model, 'dialogflow.entities')) {
            if (!fs.existsSync(DialogFlowUtil.getEntitiesFolderPath())) {
                fs.mkdirSync(DialogFlowUtil.getEntitiesFolderPath());
            }
            for (const modelDialogflowEntity of _.get(model, 'dialogflow.entities')) {
                const path = DialogFlowUtil.getEntitiesFolderPath() + path_1.sep + modelDialogflowEntity.name + '.json';
                fs.writeFileSync(path, JSON.stringify(modelDialogflowEntity, null, '\t'));
                if (modelDialogflowEntity.entries) {
                    const pathEntries = DialogFlowUtil.getEntitiesFolderPath() + path_1.sep + modelDialogflowEntity.name + '_usersays_' + outputLocale + '.json';
                    fs.writeFileSync(pathEntries, JSON.stringify(modelDialogflowEntity.entries, null, '\t'));
                    delete modelDialogflowEntity.entries;
                }
            }
        }
    }
}
JovoCliPlatformGoogle.PLATFORM_KEY = 'googleAction';
exports.JovoCliPlatformGoogle = JovoCliPlatformGoogle;
//# sourceMappingURL=Platform.js.map