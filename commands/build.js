#!/usr/bin/env node
'use strict';
const Prompts = require('./../utils/prompts');

const Listr = require('listr');
const fs = require('fs');

const Helper = require('./../helper/lmHelper');
const JovoRenderer = require('../utils/jovoRenderer');
const Validator = require('../utils/validator');
const AlexaHelper = require('./../helper/alexaUtil');

const buildTask = require('./tasks').buildTask;
const buildReverseTask = require('./tasks').buildReverseTask;
const deployTask = require('./tasks').deployTask;


// Helper.Project.validateModel('en-US');
// process.exit();

module.exports = function(vorpal) {
    vorpal
        .command('build', 'test')
        .description('create new project into given directory')
        .option('-l, --locale <locale>', 'Locale')
        .option('-p, --platform <platform>', 'alexa, dialogflow')
        .option('-d, --deploy', 'deploy')
        .option('-r, --reverse', 'from alexa')
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
                type: args.options.platform || Helper.Project.getProjectPlatform(),
                askProfile: args.options['ask-profile'] || Helper.DEFAULT_ASK_PROFILE,
            };
            let p = Promise.resolve();
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
            } else {
                // build project
                tasks.add({
                        title: 'Building language model',
                        task: (ctx, task) => buildTask(ctx, task),
                    }
                );

                // deploy project
                if (args.options.deploy) {
                    tasks.add({
                        title: 'Deploying',
                        task: (ctx, task) => deployTask(ctx, task),
                    });
                }


                if (config.type === Helper.PLATFORM_NONE) {
                    p = p.then(() => {
                        return Prompts.promptForPlatform().then((answers) => {
                            config.type = answers.platform;
                            console.log();
                            console.log();
                        });
                    });
                }
            }


            p.then(() => {
                return tasks.run(config).then(() => {
                    console.log();
                    console.log('  Installation completed. You\'re all set');
                    console.log();
                }).catch((err) => {
                    console.error(err);
                });
            });
        })
        .help((args) => {

        });
};
