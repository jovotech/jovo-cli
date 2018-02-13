#!/usr/bin/env node
'use strict';
const Listr = require('listr');

const Prompts = require('./../utils/prompts');
const JovoRenderer = require('../utils/jovoRenderer');
const buildTask = require('./tasks').buildTask;
const initTask = require('./tasks').initTask;
const deployTask = require('./tasks').deployTask;
const Validator = require('../utils/validator');
const Helper = require('../helper/lmHelper');

module.exports = function(vorpal) {
    vorpal
        .command('init [platform]', 'test')
        .description('Initializes platform-specific projects in app.json.')
        .option('-i, --init [platform]', 'alexa, dialogflow')
        .option('-b, --build', 'alexa, dialogflow')
        .option('-d, --deploy', 'deploy')
        .option('-l, --locale <locale>', 'Locale')
        .option('-t, --target <target>', 'target')
        .option('--ask-profile <askProfile>', 'ask profile')
        .option('-e, --endpoint <endpoint>', 'type of endpoint')
        .validate(function(args) {
            return Validator.isValidPlatform(args.platform) &&
                Validator.isValidLocale(args.options.locale) &&
                Validator.isValidDeployTarget(args.options.target) &&
                Validator.isValidEndpoint(args.options.endpoint) &&
                Validator.isValidAskProfile(args.options['ask-profile']);
        })
        .action((args) => {
            const tasks = new Listr([], {
                renderer: JovoRenderer,
                collapse: false,
            });

            let p = Promise.resolve();
            let config = {
                type: args.platform,
                locales: Helper.Project.getLocales(args.options.locale),
                endpoint: args.options.endpoint || Helper.DEFAULT_ENDPOINT,
                target: args.options.target || Helper.DEFAULT_TARGET,
                askProfile: args.options['ask-profile'] || Helper.DEFAULT_ASK_PROFILE,
            };
            if (!args.platform) {
                p = p.then(() => {
                    return Prompts.promptForPlatform().then((answers) => {
                        config.type = answers.platform;
                        console.log();
                        console.log();
                    });
                });
            }

            if (args.options.deploy) {
                p = p.then(() => {
                    if (!args.options.build) {
                        console.log('Please use --build if you use --deploy');
                        callback();
                    }
                });
            }

            p.then(() => {
                tasks.add(
                    initTask()
                );

                // build project
                if (args.options.build) {
                    // build project
                    tasks.add({
                        title: 'Building',
                        task: (ctx) => {
                            return new Listr(buildTask(ctx));
                        },
                    });
                }
                // deploy project
                if (args.options.deploy) {
                    tasks.add({
                        title: 'Deploying',
                        task: (ctx) => {
                            return new Listr(deployTask(ctx));
                        },
                    });
                }

                tasks.run(config).then(() => {
                    console.log();
                    console.log('  Initialization completed.');
                    console.log();
                }).catch((err) => {
                    console.log();
                    console.error(err.message);
                });
            });
        })
        .help((args) => {

        });
};
