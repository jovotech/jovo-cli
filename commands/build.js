#!/usr/bin/env node
'use strict';
const Prompts = require('./../utils/prompts');
const _ = require('lodash');

const Listr = require('listr');

const Helper = require('./../helper/lmHelper');
const JovoRenderer = require('../utils/jovoRenderer');
const Validator = require('../utils/validator');
const AlexaHelper = require('./../helper/alexaUtil');
const initTask = require('./tasks').initTask;

const buildTask = require('./tasks').buildTask;
const buildReverseTask = require('./tasks').buildReverseTask;
const deployTask = require('./tasks').deployTask;


module.exports = function(vorpal) {
    vorpal
        .command('build')
        .description('Build platform-specific language models based on jovo models folder.')
        .option('-l, --locale <locale>',
            'Locale of the language model.\n\t\t\t\t<en-US|de-DE|etc> Default: en-US')
        .option('-p, --platform <platform>',
            'Platform \n\t\t\t\t <alexaSkill|googleAction>')
        .option('-d, --deploy',
            'Runs deploy after build')
        .option('-r, --reverse',
            'Builds Jovo language model from Alexa Interaction Model')
        .option('-t, --target <target>',
            'Target of build \n\t\t\t\t<info|model> Default: all')
        .option('-s, --src <src>',
            'Path to source files \n\t\t\t\t Default: <project directory>')
        .option('--stage <stage>',
            'Takes configuration from <stage>')
        .option('--endpoint <endpoint>',
            'Type of endpoint \n\t\t\t\t<jovo-webhook|bst-proxy|ngrok|none> - Default: jovo-webhook')
        .option('\n')
        .option('--ask-profile <askProfile>',
            'Name of use ASK profile \n\t\t\t\tDefault: default')
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
                type: args.options.platform || Helper.Project.getPlatform(args.options.platform),
                endpoint: args.options.endpoint || Helper.DEFAULT_ENDPOINT,
                target: args.options.target || Helper.DEFAULT_TARGET,
                src: args.options.src || _.get(Helper.Project.getConfig(args.options.stage), 'src') || Helper.Project.getProjectPath(),
                stage: args.options.stage,
                askProfile: args.options['ask-profile'] || _.get(Helper.Project.getConfig(args.options.stage), 'alexaSkill.ask-profile') || Helper.DEFAULT_ASK_PROFILE,
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
                if (config.type.indexOf(Helper.PLATFORM_ALEXASKILL) > -1) {
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
                            });
                        });
                    }
                } else if (config.type.indexOf(Helper.PLATFORM_GOOGLEACTION) > -1) {

                }
            }

            p.then(() => {
                    if (!Helper.Project.hasAppJson() && !args.options.reverse) {
                        tasks.add(
                            initTask()
                        );
                    }

                    if (args.options.reverse) {
                        tasks.add(
                            {
                                title: 'Building language model platform model',
                                task: (ctx) => buildReverseTask(ctx),
                            }
                        );
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
                    console.log('  Build completed.');
                    console.log();
                }).catch((err) => {
                    console.error(err);
                });
            });
        })
        .help((args) => {

        });
};
