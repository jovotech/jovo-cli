#!/usr/bin/env node
'use strict';
const _ = require('lodash');

const Listr = require('listr');

const Helper = require('./../helper/lmHelper');
const JovoRenderer = require('../utils/jovoRenderer');

const getTask = require('./tasks').getTask;
const buildReverseTask = require('./tasks').buildReverseTask;

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
    .command('get <platform>')
    .description('Downloads an existing platform project into the platforms folder.')
    .option('-l, --locale <locale>',
        'Locale of the language model.\n\t\t\t\t<en-US|de-DE|etc> Default: all locales')
    .option('\n')
    .option('-t, --target <target>',
        'Type of data that is downloaded. \n\t\t\t\t<info|model|all> Default: all')
    .option('--project-id <projectId>',
        'Google Cloud Project ID')
    .option('--list-skills',
        'Lists all skills for the given ASK profile')
    .option('-s, --skill-id <skillId>',
        'Alexa Skill ID')
    .option('-b, --build',
        'Runs build after get. Works only with --reverse')
    .option('-r, --reverse',
        'Builds Jovo language model from Alexa Interaction Model')
    .option('--ask-profile <askProfile>',
        'Name of use ASK profile \n\t\t\t\tDefault: default')

    .validate(function(args) {
        return Validator.isValidLocale(args.options.locale) &&
            // Validator.isValidPlatformGet(args.platform) &&
            Validator.isValidDeployTarget(args.options.target) &&
            Validator.isValidAskProfile(args.options['ask-profile']);
    })
    .action((args, callback) => {
        let p = Promise.resolve();
        const tasks = new Listr([], {
            renderer: JovoRenderer,
            collapse: false,
        });

        let config = {};
        try {
            config.skillId = AlexaHelper.getSkillId();
        } catch (error) {
        }

        if (config.skillId) {
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
            _.merge(config, {
                locales: Helper.Project.getLocales(args.options.locale),
                type: args.platform || Helper.Project.getProjectPlatform2(),
                target: args.options.target || Helper.TARGET_ALL,
                skillId: args.options['skill-id'] || config.skillId,
                projectId: args.options['project-id'],
                askProfile: args.options['ask-profile'] || Helper.DEFAULT_ASK_PROFILE,
            });
            let subp = Promise.resolve();
            if (config.type === Helper.PLATFORM_ALEXASKILL) {
                if (!config.skillId) {
                    // if(args.options['list-skills']) {
                    subp = subp
                        .then(() => AlexaHelper.Ask.checkAsk())
                        .then(() => AlexaHelper.Ask.askApiListSkills(config))
                        .then((json) => {
                            return Promise.resolve(prepareSkillList(json));
                    }).then((choices) => Prompts.promptListForSkillId(choices)).then((answers) => {
                        config.skillId = answers.skillId;
                    }).catch((error) => {
                        console.log(error.message);
                        callback();
                    });
                }
            } else if (config.type === Helper.PLATFORM_GOOGLEACTION) {

            }

            if (args.options.reverse) {
                if (config.type === Helper.PLATFORM_ALEXASKILL) {
                    // take locales from alexaSkill/models directory
                    config.locales = AlexaHelper.getLocales(args.options.locale);

                    if (Helper.Project.hasModelFiles(config.locales)) {
                        subp = subp.then(() => {
                            return Prompts.promptOverwriteReverseBuild().then((answers) => {
                                if (answers.promptOverwriteReverseBuild === Prompts.ANSWER_CANCEL) {
                                    // exit on cancel
                                    callback();
                                } else {
                                    config.reverse = answers.promptOverwriteReverseBuild;
                                }
                            });
                        });
                    }
                } else if (config.type === Helper.PLATFORM_GOOGLEACTION) {

                }
            }

            getTask(config).forEach((t) => tasks.add(t));
            return subp.then(() => Promise.resolve(config));
        });

        p.then((config) => {
            if (args.options.build &&
                args.options.reverse) {
                // build project
                tasks.add(
                    {
                        title: 'Building language model platform model',
                        task: (ctx) => buildReverseTask(ctx),
                    }
                );
            }

            return tasks.run(config).then(() => {
                console.log();
                console.log('  Get completed.');
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
