#!/usr/bin/env node
'use strict';
const Prompts = require('./../utils/prompts');

const Listr = require('listr');

const Helper = require('./../helper/lmHelper');
const JovoRenderer = require('../utils/jovoRenderer');
const Validator = require('../utils/validator');
const AlexaHelper = require('./../helper/alexaUtil');
const initTask = require('./tasks').initTask;

const buildTask = require('./tasks').buildTask;
const buildReverseTask = require('./tasks').buildReverseTask;
const deployTask = require('./tasks').deployTask;


// Helper.Project.validateModel('en-US');
// process.exit();

module.exports = function(vorpal) {
    vorpal
        .command('build', 'test')
        .description('Build platform-specific language models based on jovo models folder.')
        .option('-l, --locale <locale>', 'Locale')
        .option('-p, --platform <platform>', 'alexa, dialogflow')
        .option('-d, --deploy', 'deploy')
        .option('-r, --reverse', 'from alexa')
        .option('-t, --target <target>', 'target')
        .option('--ask-profile <askProfile>', 'ask profile')
        .option('--endpoint <endpoint>', 'type of endpoint')
        .validate(function(args) {
            return Validator.isValidLocale(args.options.locale) &&
                Validator.isValidPlatform(args.options.platform) &&
                Validator.isValidAskProfile(args.options['ask-profile']);
        })
        .action((args, callback) => {
            const tasks = new Listr([], {
                renderer: JovoRenderer,
                collapse: false,
            });
            let config = {
                locales: Helper.Project.getLocales(args.options.locale),
                type: Helper.Project.getPlatform(args.options.platform),
                endpoint: args.options.endpoint || Helper.DEFAULT_ENDPOINT,
                target: args.options.target || Helper.DEFAULT_TARGET,
                askProfile: args.options['ask-profile'] || Helper.DEFAULT_ASK_PROFILE,
            };
            let p = Promise.resolve();
            // run init if necessary
            if (!Helper.Project.hasAppJson()) {
                if (config.type.length === 0) {
                    p = p.then(() => {
                        return Prompts.promptForInit().then((answers) => {
                            config.type = answers.platform;
                            console.log();
                            console.log();
                        });
                    });
                }
            }


            if (args.options.reverse) {
                // take locales from alexaSkill/models directory
                config.locales = AlexaHelper.getLocales(args.options.locale);

                if (Helper.Project.hasModelFiles(config.locales)) {
                    p = p.then(() => {
                        return Prompts.promptOverwriteReverseBuild().then((answers) => {
                            if (answers.promptOverwriteReverseBuild === Prompts.ANSWER_CANCEL) {
                                // exit on cancel
                                callback();
                            } else {
                                config.reverse = answers.promptOverwriteReverseBuild;
                            }

                            tasks.add(
                                {
                                    title: 'Building language model from alexa model',
                                    task: (ctx) => buildReverseTask(ctx),
                                }
                            );
                        });
                    });
                } else {
                    tasks.add(
                        {
                            title: 'Building language model from alexa model',
                            task: (ctx) => buildReverseTask(ctx),
                        }
                    );
                }
            }


            p.then(() => {
                    if (!Helper.Project.hasAppJson()) {
                        tasks.add(
                            initTask()
                        );
                    }

                    if (args.options.reverse) {

                    } else {
                        // build project
                        buildTask(config).forEach((t) => tasks.add(t));
                        // deploy project
                        if (args.options.deploy) {
                            tasks.add({
                                title: 'Deploying',
                                task: (ctx) => {
                                    return new Listr(deployTask(ctx));
                                },
                            });
                        }
                    }

                    return tasks.run(config).then(() => {
                    console.log();
                    console.log('  Installation completed.');
                    console.log();
                }).catch((err) => {
                    console.error(err);
                });
            });
        })
        .help((args) => {

        });
};
