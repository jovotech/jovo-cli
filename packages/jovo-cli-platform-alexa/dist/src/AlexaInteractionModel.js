'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
const fs = require("fs");
const project = require('jovo-cli-core').getProject();
const BUILTIN_PREFIX = 'AMAZON.';
class AlexaInteractionModel {
    constructor(obj) {
        if (obj) {
            Object.assign(this, obj);
        }
    }
    reverse() {
        const jovoModel = {
            invocation: _.get(this, 'interactionModel.languageModel.invocationName')
        };
        if (_.get(this, 'interactionModel.prompts')) {
            _.set(jovoModel, 'alexa.interactionModel.prompts', _.get(this, 'interactionModel.prompts'));
        }
        if (_.get(this, 'interactionModel.dialog')) {
            _.set(jovoModel, 'alexa.interactionModel.dialog', _.get(this, 'interactionModel.dialog'));
        }
        const alexaIntents = [];
        const jovoIntents = [];
        let intent;
        for (intent of _.get(this, 'interactionModel.languageModel.intents')) {
            if (_.startsWith(intent.name, BUILTIN_PREFIX)) {
                alexaIntents.push(intent);
            }
            else {
                const jovoIntent = {
                    name: intent.name,
                    phrases: intent.samples,
                };
                const inputs = [];
                if (intent.slots) {
                    for (const slot of intent.slots) {
                        const input = {
                            name: slot.name,
                            type: slot.type
                        };
                        if (_.startsWith(slot.type, BUILTIN_PREFIX)) {
                            input.type = {
                                alexa: slot.type,
                            };
                        }
                        if (slot.samples) {
                            input.alexa = {
                                samples: slot.samples,
                            };
                        }
                        inputs.push(input);
                    }
                    jovoIntent.inputs = inputs;
                }
                jovoIntents.push(jovoIntent);
            }
        }
        if (_.get(this, 'interactionModel.languageModel.types')) {
            const inputTypes = [];
            for (const type of _.get(this, 'interactionModel.languageModel.types')) {
                const values = [];
                let tV;
                for (const typeValue of type.values) {
                    tV = {
                        value: typeValue.name.value,
                    };
                    if (typeValue.name.synonyms) {
                        tV.synonyms = typeValue.name.synonyms;
                    }
                    if (typeValue.id) {
                        tV.id = typeValue.id;
                    }
                    values.push(tV);
                }
                inputTypes.push({
                    name: type.name,
                    values
                });
            }
            _.set(jovoModel, 'inputTypes', inputTypes);
        }
        _.set(jovoModel, 'alexa.interactionModel.languageModel.intents', alexaIntents);
        _.set(jovoModel, 'intents', jovoIntents);
        return jovoModel;
    }
    transform(locale, stage, getModelPath) {
        const errorPrefix = '/models/' + locale + '.json - ';
        let locales = [];
        if (locale.length === 2) {
            try {
                if (!project.getConfigParameter(`alexaSkill.nlu.lang.${locale}`, stage)) {
                    throw new Error();
                }
                locales = project.getConfigParameter(`alexaSkill.nlu.lang.${locale}`, stage);
            }
            catch (error) {
                throw new Error('Could not retrieve locales mapping for language ' + locale);
            }
        }
        else {
            locales = [locale];
        }
        let model;
        try {
            model = project.getModel(locale);
        }
        catch (e) {
            console.log(e);
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
        if (project.getConfigParameter(`alexaSkill.languageModel.${locale}`, stage)) {
            model = _.mergeWith(model, project.getConfigParameter(`alexaSkill.languageModel.${locale}`, stage), concatArrays);
        }
        const alexaModel = {
            interactionModel: {
                languageModel: {
                    invocationName: ''
                }
            }
        };
        _.set(alexaModel, 'interactionModel.languageModel.invocationName', model.invocation);
        if (alexaModel.interactionModel.languageModel.invocationName.length < 2 ||
            alexaModel.interactionModel.languageModel.invocationName.length > 50) {
            throw new Error(errorPrefix + 'Invocation name must be between 2 and 50 characters.');
        }
        if (/[A-Z]/.test(alexaModel.interactionModel.languageModel.invocationName)) {
            throw new Error(errorPrefix + 'Invocation name cannot contain upper case characters.');
        }
        if (/\d/.test(alexaModel.interactionModel.languageModel.invocationName)) {
            throw new Error(errorPrefix + 'Invocation name may only contain alphabetic characters, apostrophes, periods and spaces.');
        }
        alexaModel.interactionModel.languageModel.types = [];
        const alexaIntents = [];
        if (model.intents) {
            for (const intent of model.intents) {
                const alexaIntentObj = {
                    name: intent.name,
                    samples: intent.phrases,
                };
                for (const sample of alexaIntentObj.samples) {
                    if (/\d/.test(sample)) {
                        throw new Error(errorPrefix + `Intent "${alexaIntentObj.name}" must not have numbers in sample`);
                    }
                }
                if (intent.inputs) {
                    alexaIntentObj.slots = [];
                    let input;
                    for (input of intent.inputs) {
                        const alexaInputObj = {
                            name: input.name,
                            type: ''
                        };
                        if (typeof input.type === 'object') {
                            if (input.type.alexa) {
                                alexaInputObj.type = input.type.alexa;
                                if (_.startsWith(input.type.alexa, BUILTIN_PREFIX)) {
                                    alexaInputObj.type = input.type.alexa;
                                }
                                else {
                                    input.type = input.type.alexa;
                                }
                            }
                            else {
                                throw new Error(errorPrefix + 'Please add an Alexa property for input "' + input.name + '"');
                            }
                        }
                        if (!alexaInputObj.type) {
                            if (!input.type) {
                                throw new Error(errorPrefix + 'Invalid input type in intent "' + intent.name + '"');
                            }
                            alexaInputObj.type = input.type;
                            if (!model.inputTypes) {
                                throw new Error(errorPrefix + 'Input type "' + alexaInputObj.type + '" must be defined in inputTypes');
                            }
                            const matchedInputTypes = model.inputTypes.filter((item) => {
                                return item.name === alexaInputObj.type;
                            });
                            if (matchedInputTypes.length === 0) {
                                throw new Error(errorPrefix + 'Input type "' + alexaInputObj.type + '" must be defined in inputTypes');
                            }
                            if (!alexaModel.interactionModel.languageModel.types) {
                                alexaModel.interactionModel.languageModel.types = [];
                            }
                            for (const matchedInputType of matchedInputTypes) {
                                const alexaTypeObj = {
                                    name: matchedInputType.alexa || matchedInputType.name,
                                    values: [],
                                };
                                if (!matchedInputType.values) {
                                    throw new Error(errorPrefix + `Input type "${matchedInputType.name}" must have at least one value`);
                                }
                                for (const value of matchedInputType.values) {
                                    const alexaTypeValueObj = {
                                        id: value.id ? value.id : null,
                                        name: {
                                            value: value.value,
                                        },
                                    };
                                    if (value.synonyms) {
                                        alexaTypeValueObj.name.synonyms = value.synonyms;
                                    }
                                    alexaTypeObj.values.push(alexaTypeValueObj);
                                }
                                const existingAlexaTypes = alexaModel.interactionModel.languageModel.types.filter((item) => {
                                    return alexaTypeObj.name === item.name;
                                });
                                if (existingAlexaTypes.length === 0) {
                                    alexaModel.interactionModel.languageModel.types.push(alexaTypeObj);
                                }
                            }
                        }
                        if (input.alexa) {
                            _.merge(alexaInputObj, input.alexa);
                        }
                        alexaIntentObj.slots.push(alexaInputObj);
                    }
                }
                if (_.get(intent, 'alexa')) {
                    _.assign(alexaIntentObj, intent.alexa);
                }
                alexaIntents.push(alexaIntentObj);
            }
        }
        if (_.get(model, 'alexa.interactionModel.languageModel.intents')) {
            for (const intent of _.get(model, 'alexa.interactionModel.languageModel.intents')) {
                alexaIntents.push(intent);
            }
        }
        _.set(alexaModel, 'interactionModel.languageModel.intents', alexaIntents);
        if (_.get(model, 'alexa.interactionModel.prompts')) {
            _.set(alexaModel, 'interactionModel.prompts', _.get(model, 'alexa.interactionModel.prompts'));
        }
        if (_.get(model, 'alexa.interactionModel.languageModel.types')) {
            _.set(alexaModel, 'interactionModel.languageModel.types', _.get(model, 'alexa.interactionModel.languageModel.types'));
        }
        if (_.get(model, 'alexa.interactionModel.dialog')) {
            _.set(alexaModel, 'interactionModel.dialog', _.get(model, 'alexa.interactionModel.dialog'));
        }
        if (_.get(model, 'inputTypes')) {
            for (const inputType of model.inputTypes) {
                let findings = [];
                if (_.get(alexaModel, 'interactionModel.languageModel.types')) {
                    findings = alexaModel.interactionModel.languageModel.types.filter((item) => {
                        return inputType.name === item.name;
                    });
                }
                if (findings.length > 0) {
                    continue;
                }
                const alexaType = {
                    name: inputType.name,
                    values: [],
                };
                if (inputType.values) {
                    for (const value of inputType.values) {
                        const alexaTypeValue = {
                            id: value.id || null,
                            name: {
                                value: value.value,
                            },
                        };
                        if (value.synonyms) {
                            alexaTypeValue.name.synonyms = value.synonyms;
                        }
                        alexaType.values.push(alexaTypeValue);
                    }
                }
                alexaModel.interactionModel.languageModel.types.push(alexaType);
            }
        }
        for (const targetLocale of locales) {
            fs.writeFileSync(getModelPath(targetLocale), JSON.stringify(alexaModel, null, '\t'));
        }
    }
}
module.exports.AlexaInteractionModel = AlexaInteractionModel;
//# sourceMappingURL=AlexaInteractionModel.js.map