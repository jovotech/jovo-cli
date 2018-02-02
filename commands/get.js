#!/usr/bin/env node
'use strict';
const _ = require('lodash');

const Listr = require('listr');

const Helper = require('./../helper/lmHelper');
const JovoRenderer = require('../utils/jovoRenderer');

const getTask = require('./tasks').getTask;
const AlexaHelper = require('./../helper/alexaUtil');
const chalk = require('chalk');
const Validator = require('./../utils/validator');
const Prompts = require('./../utils/prompts');

if (process.argv.indexOf('get') > 0 &&
    (_.get(process, 'argv[3]') !== Helper.PLATFORM_ALEXASKILL &&
        _.get(process, 'argv[3]') !== Helper.PLATFORM_GOOGLEACTION)) {
    process.argv.splice(3, 0, Helper.Project.getProjectPlatform2());
}


module.exports = function(vorpal) {
vorpal
    .command('get <platform>', 'test')
    .description('create new project into given directory')
    .option('\n')
    .option('-l, --list-skills', 'list skills')
    .option('-s, --skill-id <skillId>', 'skill id')
    .option('-l, --locale <locale>', 'Locale')
    .option('-t, --target <target>', 'target')
    .option('--ask-profile <askProfile>', 'ask profile')
    .validate(function(args) {
        return Validator.isValidLocale(args.options.locale) &&
            Validator.isValidPlatform(args.platform) &&
            Validator.isValidDeployTarget(args.options.target) &&
            Validator.isValidAskProfile(args.options['ask-profile']);
    })
    .action((args, callback) => {
        let p = Promise.resolve();
        const tasks = new Listr([], {
            renderer: JovoRenderer,
            collapse: false,
        });

        if (AlexaHelper.getSkillId()) {
            p = p.then(() => {
                return Prompts.promptOverwriteProjectAlexaSkill().then((answers) => {
                    if (answers.overwrite === Prompts.ANSWER_CANCEL) {
                        callback();
                    } else {
                        return Promise.resolve();
                    }
                });
            });
        }


        p = p.then(() => {
            let config = {
                locales: Helper.Project.getLocales(args.options.locale),
                type: args.options.platform || Helper.Project.getProjectPlatform2(),
                target: args.options.target || Helper.TARGET_ALL,
                skillId: args.options['skill-id'] || AlexaHelper.getSkillId(),
                askProfile: args.options['ask-profile'] || Helper.DEFAULT_ASK_PROFILE,
            };

            let subp = Promise.resolve();
            if (config.type === Helper.PLATFORM_NONE) {
                subp = subp.then(() => {
                    return Prompts.promptForPlatform().then((answers) => {
                        config.type = answers.platform;
                        if (config.type === Helper.PLATFORM_ALEXASKILL) {
                            if (!config.skillId) {
                                return Prompts.promptForSkillId().then((answers) => {
                                    config.skillId = answers.skillId;
                                });
                            }
                            return Promise.resolve();
                        } else {
                            return Promise.resolve();
                        }
                    });
                });
            } else if (config.type === Helper.PLATFORM_ALEXASKILL) {
                if (!config.skillId) {
                    // if(args.options['list-skills']) {
                    subp = subp.then(() => AlexaHelper.Ask.askApiListSkills(config).then((json) => {
                        return Promise.resolve(prepareSkillList(json));
                    })).then((choices) => Prompts.promptListForSkillId(choices)).then((answers) => {
                        config.skillId = answers.skillId;
                    });
                }
            }

            tasks.add({
                title: 'Getting',
                task: (ctx, task) => getTask(ctx, task),
            });


            return subp.then(() => Promise.resolve(config));
        });


        p.then((config) => {
            return tasks.run(config).then(() => {
                console.log();
                console.log('  get completed. You\'re all set');
                console.log();
                callback();
            }).catch((err) => {
                console.log();
                console.error(err.message);
            });
        });
    })
    .help((args) => {

    });
};


/**
 * Generates choice list from skills
 * @param {*} json
 * @return {Array}
 */
function prepareSkillList(json) {
    json.skills.sort(function(a, b) {
        // Turn your strings into dates, and then subtract them
        // to get a value that is either negative, positive, or zero.
        return new Date(b.lastUpdated) - new Date(a.lastUpdated);
    });
    let map = {
        development: 'dev',
    };
    let choices = [];
    for (let item of json.skills) {
        let message = '';
        let key = Object.keys(item.nameByLocale)[0];
        message += item.nameByLocale[key];
        let stage = map[item.stage] ? map[item.stage] : item.stage;
        message += ' ' + (stage === 'live' ? chalk.green(stage) : chalk.yellow(stage)) + ' ';
        message += '- ' + item.lastUpdated.substr(0, 10);
        message += ' '+ chalk.grey(item.skillId);

        choices.push({
            name: message,
            value: item.skillId,
        });
    }
    return choices;
}
