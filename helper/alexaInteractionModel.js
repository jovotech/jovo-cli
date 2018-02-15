'use strict';
const _ = require('lodash');
const fs = require('fs');
const BUILTIN_PREFIX = 'AMAZON.';

/**
 * Class AlexaInteractionModel
 */
class AlexaInteractionModel {

    /**
     * Constructor
     * @param {*} obj
     */
    constructor(obj) {
        if (obj) {
            Object.assign(this, obj);
        }
    }

    /**
     * Transforms Alexa model to Jovo model
     * @return {*}
     */
    reverse() {
        let jovoModel = {};
        jovoModel.invocation = _.get(this, 'interactionModel.languageModel.invocationName');

        // prompts
        if (_.get(this, 'interactionModel.prompts')) {
            _.set(jovoModel, 'alexa.interactionModel.prompts', _.get(this, 'interactionModel.prompts'));
        }

        // dialog
        if (_.get(this, 'interactionModel.dialog')) {
            _.set(jovoModel, 'alexa.interactionModel.dialog', _.get(this, 'interactionModel.dialog'));
        }

        let alexaIntents = [];
        let jovoIntents = [];
        for (let intent of _.get(this, 'interactionModel.languageModel.intents')) {
            if (_.startsWith(intent.name, BUILTIN_PREFIX)) {
                alexaIntents.push(intent);
            } else {
                let jovoIntent = {
                    name: intent.name,
                    phrases: intent.samples,
                };
                let inputs = [];
                if (intent.slots) {
                    for (let slot of intent.slots) {
                        if (_.startsWith(slot.type, BUILTIN_PREFIX)) {
                                inputs.push({
                                name: slot.name,
                                type: {
                                    alexa: slot.type,
                                },
                            });
                        } else {
                            inputs.push({
                                name: slot.name,
                                type: slot.type,
                            });
                        }
                    }
                    jovoIntent.inputs = inputs;
                }
                jovoIntents.push(jovoIntent);
            }
        }

        if (_.get(this, 'interactionModel.languageModel.types')) {
            // input types
            let inputTypes = [];
            for (let type of _.get(this, 'interactionModel.languageModel.types')) {
                let values = [];
                for (let typeValue of type.values) {
                    let tV = {
                        value: typeValue.name.value,
                    };
                    if (typeValue.name.synonyms) {
                        tV.synonyms = typeValue.name.synonyms;
                    }
                    values.push(tV);
                }
                inputTypes.push({
                    name: type.name,
                    values: values,
                });
            }
            _.set(jovoModel, 'inputTypes', inputTypes);
        }

        _.set(jovoModel, 'alexa.interactionModel.languageModel.intents', alexaIntents);
        _.set(jovoModel, 'intents', jovoIntents);
        return jovoModel;
    }

    /**
     * Transforms jovo model to Alexa model
     * @param {*} model
     */
    transform(model) {
        this.interactionModel.languageModel.invocationName = model.invocation;
        this.interactionModel.languageModel.types = [];

        let alexaIntents = [];
        // convert generic intents
        for (let intent of model.intents) {
            let alexaIntentObj = {
                name: intent.name,
                samples: intent.phrases,
            };
            // handle intent inputs
            if (intent.inputs) {
                alexaIntentObj.slots = [];

                for (let input of intent.inputs) {
                    let alexaInputObj = {
                        name: input.name,
                    };

                    if (typeof input.type === 'object') {
                        if (input.type.alexa) {
                            alexaInputObj.type = input.type.alexa;
                            if (_.startsWith(input.type.alexa, BUILTIN_PREFIX)) {
                                alexaInputObj.type = input.type.alexa;
                            } else {
                                input.type = input.type.alexa;
                            }
                        } else {
                            throw new Error('Please add a dialogflow property for input "'+input.name+'"');
                        }
                    }

                    // handle custom input types
                    if (!alexaInputObj.type) {
                        if (!input.type) {
                            throw new Error('Invalid input type in intent "' + intent.name + '"');
                        }

                        alexaInputObj.type = input.type;

                        // throw error when no inputTypes object defined
                        if (!model.inputTypes) {
                            throw new Error('Input type "' + alexaInputObj.type + '" must be defined in inputTypes');
                        }

                        // find type in global inputTypes array
                        let matchedInputTypes = model.inputTypes.filter((item) => {
                           return item.name === alexaInputObj.type;
                        });

                        if (matchedInputTypes.length === 0) {
                            throw new Error('Input type "' + alexaInputObj.type + '" must be defined in inputTypes');
                        }

                        if (!this.interactionModel.languageModel.types) {
                            this.interactionModel.languageModel.types = [];
                        }

                        // create alexaTypeObj from matched input types
                        for (let matchedInputType of matchedInputTypes) {
                            let alexaTypeObj = {
                                name: matchedInputType.name,
                                values: [],
                            };
                            // create alexaTypeValueObj
                            for (let value of matchedInputType.values) {
                                let alexaTypeValueObj = {
                                    id: value.id ? value.id : null,
                                    name: {
                                        value: value.value,
                                    },
                                  };
                                // save synonyms, if defined
                                if (value.synonyms) {
                                    alexaTypeValueObj.name.synonyms = value.synonyms;
                                }
                                alexaTypeObj.values.push(alexaTypeValueObj);
                            }

                            // skip existing alexa types
                            let existingAlexaTypes = this.interactionModel.languageModel.types.filter((item) => { // eslint-disable-line
                                return alexaTypeObj.name === item.name;
                            });

                            if (existingAlexaTypes.length === 0) {
                                // add type to interaction model
                                this.interactionModel.languageModel.types.push(alexaTypeObj);
                            }
                        }
                    }
                    alexaIntentObj.slots.push(alexaInputObj);
                }
            }

            if (_.get(intent, 'alexaSkill')) {
                _.merge(alexaIntentObj, intent.alexaSkill);
            }

            alexaIntents.push(alexaIntentObj);
        }

        // convert alexa specific intents
        for (let intent of _.get(model, 'alexa.interactionModel.languageModel.intents')) {
            alexaIntents.push(intent);
        }
        _.set(this, 'interactionModel.languageModel.intents', alexaIntents);

        // prompts
        if (_.get(model, 'alexa.interactionModel.prompts')) {
            _.set(this, 'interactionModel.prompts', _.get(model, 'alexa.interactionModel.prompts'));
        }

        // dialog
        if (_.get(model, 'alexa.interactionModel.dialog')) {
            _.set(this, 'interactionModel.dialog', _.get(model, 'alexa.interactionModel.dialog'));
        }

        // types
        if (_.get(model, 'inputTypes')) {
            for (let inputType of model.inputTypes) {
                let findings = [];

                // skip input types that are already in alexa types
                if (_.get(this, 'interactionModel.languageModel.types')) {
                    findings = this.interactionModel.languageModel.types.filter((item) => {
                        return inputType.name === item.name;
                    });
                }

                if (findings.length > 0) {
                    continue;
                }

                // create alexa type
                let alexaType = {
                    name: inputType.name,
                    values: [],
                };

                // iterate through values
                for (let value of inputType.values) {
                    let alexaTypeValue = {
                        id: value.id,
                        name: {
                            value: value.value,
                        },
                    };

                    if (value.synonyms) {
                        alexaTypeValue.name.synonyms = value.synonyms;
                    }

                    alexaType.values.push(alexaTypeValue);
                }

                this.interactionModel.languageModel.types.push(alexaType);
            }
        }
    }

    /**
     * Save Alexa model to file
     * @param {string} locale
     * @return {Promise<any>}
     */
    save(locale) {
        return new Promise((resolve, reject) => {
            fs.writeFile(require('./alexaUtil').getModelPath(locale), JSON.stringify(this, null, '\t'), function(err, data) {
                if (err) {
                    return reject(err);
                }
                resolve();
            });
        });
    }
}


// let alexaModel = require('./demoproject/platforms/alexaSkill/models/en-US.json');
//
// let aim = new AlexaInteractionModel(alexaModel);
//
// let model = require('./demoproject/models/en-US.json');
// // aim.validateSlots(model);
// aim.transform(model);
//
// aim.save('en-US', function() {
//     console.log('done');
// });

//
// let jovoModel = new JovoModel();
// jovoModel.fromAlexa(require('./../demo/platforms/alexaSkill/models/de-DE'))
//
// console.log(JSON.stringify(jovoModel, null, '\t'));
//
module.exports.AlexaInteractionModel = AlexaInteractionModel;
