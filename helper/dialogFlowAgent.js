'use strict';
const _ = require('lodash');
const fs = require('fs');
const DialogFlowUtil = require('./dialogflowUtil');
const BUILTIN_PREFIX = '@sys.';
const pathSep = require('path').sep;

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
    'webhookUsed': true,
    'webhookForSlotFilling': false,
    'fallbackIntent': false,
    'events': [],
};

const DEFAULT_ENTITY = {
    'isOverridable': true,
    'isEnum': false,
    'automatedExpansion': false,
};
/**
 * Class DialogFlowAgent
 */
class DialogFlowAgent {
    /**
     * Constructor
     * Config with locale information
     * @param {*} config
     */
    constructor(config) {
        this.config = config;
    }

    /**
     * Skips default intent properties
     * @param {*} jovoIntent
     * @param {*} dialogFlowIntent
     * @return {*}
     */
    static skipDefaultIntentProps(jovoIntent, dialogFlowIntent) {
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

        return jovoIntent;
    }

    /**
     * Skips default entity properties
     * @param {*} jovoInput
     * @param {*} dialogflowEntity
     * @return {*}
     */
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

    /**
     * Transforms Dialogflow data into a Jovo model
     * @param {string} locale
     * @return {{}}
     */
    static reverse(locale) {
        let jovoModel = {};
        jovoModel.invocation = '';
        jovoModel.intents = [];
        jovoModel.inputTypes = [];
        let intentFiles = fs.readdirSync(DialogFlowUtil.getIntentsFolderPath());


        // iterate through intent files
        for (let file of intentFiles) {
            // skip usersays files
            if (file.indexOf('usersays') > -1) {
                continue;
            }
            let dialogFlowIntent = require(DialogFlowUtil.getIntentsFolderPath() + pathSep + file);


            let jovoIntent = {
                name: dialogFlowIntent.name,
                phrases: [],
            };
            // skip default intent properties
            DialogFlowAgent.skipDefaultIntentProps(jovoIntent, dialogFlowIntent);

            // is fallback intent?
            if (dialogFlowIntent.fallbackIntent === true) {
                DialogFlowAgent.skipDefaultIntentProps(jovoIntent, dialogFlowIntent);
                let fallbackIntent = jovoIntent.dialogflow;
                fallbackIntent.name = dialogFlowIntent.name;
                _.set(jovoModel, 'dialogflow.intents', [fallbackIntent]);
                continue;
            }

            // is welcome intent?
            if (_.get(dialogFlowIntent, 'events[0].name') === 'WELCOME') {
                DialogFlowAgent.skipDefaultIntentProps(jovoIntent, dialogFlowIntent);
                let welcomeIntent = jovoIntent.dialogflow;
                welcomeIntent.name = dialogFlowIntent.name;

                if (!_.get(jovoModel, 'dialogflow.intents')) {
                    _.set(jovoModel, 'dialogflow.intents', [welcomeIntent]);
                } else {
                    jovoModel.dialogflow.intents.push(welcomeIntent);
                }
                continue;
            }

            let inputs = [];
            for (let response of dialogFlowIntent.responses) {
                for (let parameter of response.parameters) {
                    let input = {
                        name: parameter.name,
                    };
                    if (_.startsWith(parameter.dataType, '@sys.')) {
                        input.type = {
                            dialogflow: parameter.dataType,
                        };
                    } else {
                        input.type = parameter.dataType.substr(1);
                    }
                    inputs.push(input);
                }
            }

            if (inputs.length > 0) {
                jovoIntent.inputs = inputs;
            }

            // iterate through usersays intent files and generate sample phrases
            let userSaysFilePath = DialogFlowUtil.getIntentsFolderPath() + pathSep + dialogFlowIntent.name + '_usersays_' + locale + '.json';
            if (fs.existsSync(userSaysFilePath)) {
                let userSays = require(userSaysFilePath);
                for (let us of userSays) {
                    let phrase = '';
                    for (let data of us.data) {
                        phrase += data.userDefined ? '{' + data.text + '}' : data.text;
                    }
                    jovoIntent.phrases.push(phrase);
                }
            }

            jovoModel.intents.push(jovoIntent);
        }
        if (fs.existsSync(DialogFlowUtil.getEntitiesFolderPath())) {
            let entitiesFiles = fs.readdirSync(DialogFlowUtil.getEntitiesFolderPath());
            // iterate through entity files
            for (let file of entitiesFiles) {
                // skip entries files
                if (file.indexOf('entries') > -1) {
                    continue;
                }
                let dialogFlowEntity = require(
                    DialogFlowUtil.getEntitiesFolderPath() + pathSep + file
                );
                let jovoInput = {
                    name: dialogFlowEntity.name,
                };
                // skip default intent properties
                DialogFlowAgent.skipDefaultEntityProps(jovoInput, dialogFlowEntity);
                // iterate through usersays intent files and generate sample phrases
                let entriesFilePath = DialogFlowUtil.getEntitiesFolderPath() + pathSep + dialogFlowEntity.name + '_entries_' + locale + '.json';
                if (fs.existsSync(entriesFilePath)) {
                    let values = [];
                    let entries = require(entriesFilePath);

                    for (let entry of entries) {
                        let value = {
                            value: entry.value,
                            synonyms: [],
                        };
                        for (let synonym of entry.synonyms) {
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

    /**
     * Creates files (agent, intents, entities)
     * @param {*} model jovoModel
     */
    transform(model) {
        // create dialog flow folder
        if (!fs.existsSync(DialogFlowUtil.getPath())) {
            fs.mkdirSync(DialogFlowUtil.getPath());
        }

        if (!fs.existsSync(DialogFlowUtil.getIntentsFolderPath())) {
            fs.mkdirSync(DialogFlowUtil.getIntentsFolderPath());
        }

        // take primary language from locales
        let primLanguage = require('./lmHelper').Project.getLocales().filter((lang) => {
            return this.config.locale.substr(0, 2) === lang.substr(0, 2);
        });
        let outputLocale = this.config.locale.toLowerCase();
        if (primLanguage.length === 1) {
            outputLocale = this.config.locale.substr(0, 2);
        }
        // throw Error(outputLocale);


        for (let intent of model.intents) {
            let intentPath = DialogFlowUtil.getIntentsFolderPath() + intent.name + '.json';
            let dfIntentObj = {
                'name': intent.name,
                'auto': true,
                'webhookUsed': true,
            };

            // handle intent inputs
            if (intent.inputs) {
                dfIntentObj.responses = [{
                    parameters: [],
                }];

                for (let input of intent.inputs) {
                    let parameterObj = {
                        isList: false,
                        name: input.name,
                        value: '$' + input.name,
                    };
                    if (typeof input.type === 'object') {
                        if (input.type.dialogflow) {
                            if (_.startsWith(input.type.dialogflow, BUILTIN_PREFIX)) {
                                parameterObj.dataType = input.type.dialogflow;
                            } else {
                                input.type = input.type.dialogflow;
                            }
                        } else {
                            throw new Error('Please add a dialogflow property for input "'+input.name+'"');
                        }
                    }
                    // handle custom input types
                    if (!parameterObj.dataType) {
                        if (!input.type) {
                            throw new Error('Invalid input type in intent "' + intent.name + '"');
                        }
                        parameterObj.dataType = input.type;
                        // throw error when no inputTypes object defined
                        if (!model.inputTypes) {
                            throw new Error('Input type "' + parameterObj.dataType + '" must be defined in inputTypes');
                        }

                        // find type in global inputTypes array
                        let matchedInputTypes = model.inputTypes.filter((item) => {
                            return item.name === parameterObj.dataType;
                        });

                        parameterObj.dataType = '@' + parameterObj.dataType;


                        if (matchedInputTypes.length === 0) {
                            throw new Error('Input type "' + parameterObj.dataType + '" must be defined in inputTypes');
                        }

                        // create entities folders + files
                        if (!fs.existsSync(DialogFlowUtil.getEntitiesFolderPath())) {
                            fs.mkdirSync(DialogFlowUtil.getEntitiesFolderPath());
                        }
                        // create alexaTypeObj from matched input types
                        for (let matchedInputType of matchedInputTypes) {
                            let dfEntityObj = {
                                name: matchedInputType.name,
                                isOverridable: true,
                                isEnum: false,
                                automatedExpansion: false,
                            };

                            if (matchedInputType.dialogflow) {
                                dfEntityObj = _.merge(dfEntityObj, matchedInputType.dialogflow);
                            }

                            let entityFilePath = DialogFlowUtil.getEntitiesFolderPath() + matchedInputType.name + '.json';
                            fs.writeFileSync(entityFilePath,
                                JSON.stringify(dfEntityObj, null, '\t')
                            );

                            // create entries if matched input type has values
                            if (matchedInputType.values && matchedInputType.values.length > 0) {
                                let entityValues = [];
                                // create dfEntityValueObj
                                for (let value of matchedInputType.values) {
                                    let dfEntityValueObj = {
                                        value: value.value,
                                        synonyms: [value.value],
                                    };

                                    // save synonyms, if defined
                                    if (value.synonyms) {
                                        dfEntityValueObj.synonyms =
                                            dfEntityValueObj.synonyms.concat(
                                                value.synonyms
                                            );
                                    }
                                    entityValues.push(dfEntityValueObj);
                                }
                                let entityEntriesFilePath = DialogFlowUtil.getEntitiesFolderPath() + matchedInputType.name + '_entries_' + outputLocale + '.json';
                                fs.writeFileSync(entityEntriesFilePath,
                                    JSON.stringify(entityValues, null, '\t')
                                );
                            }
                        }
                    }

                    dfIntentObj.responses[0].parameters.push(parameterObj);
                }
            }

            if (_.get(intent, 'dialogflow')) {
                _.merge(dfIntentObj, intent.dialogflow);
            }

            fs.writeFileSync(intentPath, JSON.stringify(dfIntentObj, null, '\t'));


            // handle user says files for intent

            let dialogFlowIntentUserSays = [];
            let re = /{(.*?)}/g;

            // iterate through phrases and intent user says data objects
            for (let phrase of intent.phrases) {
                let m;
                let data = [];
                let pos = 0;
                while (m = re.exec(phrase)) {
                    // text between entities
                    let text = phrase.substr(pos, m.index - pos);

                    // entities
                    let entity = phrase.substr(m.index + 1, m[1].length);

                    pos = m.index + 1 + m[1].length + 1;


                    let dataTextObj = {
                        text: text,
                        userDefined: false,
                    };

                    // skip empty text on entity index = 0
                    if (text.length > 0) {
                        data.push(dataTextObj);
                    }

                    let dataEntityObj = {
                        text: entity,
                        userDefined: true,
                    };

                    // create entity object based on parameters objects
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

                // if no entities in phrase use full phrase as data object
                if (data.length === 0) {
                    data = [
                        {
                            text: phrase,
                            userDefined: false,
                        },
                    ];
                }

                dialogFlowIntentUserSays.push({
                    data: data,
                    isTemplate: false,
                    count: 0,
                });
            }
            if (dialogFlowIntentUserSays.length > 0) {
                let intentUserSaysFilePath = DialogFlowUtil.getIntentsFolderPath() + intent.name + '_usersays_' + outputLocale + '.json';
                fs.writeFileSync(intentUserSaysFilePath, JSON.stringify(dialogFlowIntentUserSays, null, '\t'));
            }
        }
        // dialogflow intents form locale.json
        if (_.get(model, 'dialogflow.intents')) {
            for (let modelDialogflowIntent of _.get(model, 'dialogflow.intents')) {
                let path = DialogFlowUtil.getIntentsFolderPath() + pathSep + modelDialogflowIntent.name + '.json';
                fs.writeFileSync(path, JSON.stringify(modelDialogflowIntent, null, '\t'));
                // user says
                if (modelDialogflowIntent.userSays) {
                    let pathUserSays = DialogFlowUtil.getIntentsFolderPath() + pathSep + modelDialogflowIntent.name + '_usersays_'+ outputLocale + '.json';
                    fs.writeFileSync(pathUserSays, JSON.stringify(modelDialogflowIntent.userSays, null, '\t'));
                    delete modelDialogflowIntent.userSays;
                }
            }
        }

        // dialogflow entities form locale.json
        if (_.get(model, 'dialogflow.entities')) {
            // create entities folders + files
            if (!fs.existsSync(DialogFlowUtil.getEntitiesFolderPath())) {
                fs.mkdirSync(DialogFlowUtil.getEntitiesFolderPath());
            }
            for (let modelDialogflowEntity of _.get(model, 'dialogflow.entities')) {
                let path = DialogFlowUtil.getEntitiesFolderPath() + pathSep + modelDialogflowEntity.name + '.json';
                fs.writeFileSync(path, JSON.stringify(modelDialogflowEntity, null, '\t'));
                // entries
                if (modelDialogflowEntity.entries) {
                    let pathEntries = DialogFlowUtil.getEntitiesFolderPath() + pathSep + modelDialogflowEntity.name + '_usersays_'+ outputLocale + '.json';
                    fs.writeFileSync(pathEntries, JSON.stringify(modelDialogflowEntity.entries, null, '\t'));
                    delete modelDialogflowEntity.entries;
                }
            }
        }
    }
}
//
// let dfa = new DialogFlowAgent({locale: 'en-US'});
// let model = require('./../demo1/models/en-US.json');
// require('./lmHelper').Project.setProjectPath('demo1');
// dfa.transform(model);
// let aim = new AlexaInteractionModel(alexa);
//
// let model = require('./bla5/models/en-US.json');
// aim.transform(model);
//
// aim.save(function() {
//     console.log('done');
// });


module.exports.DialogFlowAgent = DialogFlowAgent;
