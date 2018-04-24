#!/usr/bin/env node
'use strict';
const Listr = require('listr');
const Helper = require('./../helper/lmHelper');
const Validator = require('./../utils/validator');
const chalk = require('chalk');
const Prompts = require('./../utils/prompts');
const JovoRenderer = require('../utils/jovoRenderer');
const buildTask = require('./tasks').buildTask;
const initTask = require('./tasks').initTask;
const deployTask = require('./tasks').deployTask;
const _ = require('lodash');

module.exports = function(vorpal) {
    vorpal
        .command('new [directory]')
        .description(`Create a new Jovo project`)
        .option('-t, --template <template>',
            'Name of the template. \n\t\t\t\tDefault: helloworld')
        .option('-l, --locale <locale>',
            'Locale of the language model.\n\t\t\t\t<en-US|de-DE|etc> Default: en-US')
        .option('-i, --init [platform]',
            'Runs init after new \n\t\t\t\t<alexaSkill|googleAction>')
        .option('-b, --build',
            'Runs build after new/init.')
        .option('-d, --deploy',
            'Runs deploy after new/init/build')
        .option('--ff [platform]',
            'Fast forward runs --init <platform> --build --deploy')
        .option('--invocation <invocation>',
            'Sets the invocation name (Alexa Skill)')
        .option('--skip-npminstall',
            'Skips npm install')
        .option('--ask-profile <askProfile>',
            'Name of use ASK profile \n\t\t\t\tDefault: default')
        .option('--endpoint <endpoint>',
            'Type of endpoint \n\t\t\t\t<jovo-webhook|bst-proxy|ngrok|none> - Default: jovo-webhook')

        .validate(function(args) {
            return Validator.isValidProjectName(args.directory) &&
                Validator.isValidTemplate(args.options.template) &&
                Validator.isValidLocale(args.options.locale) &&
                Validator.isValidPlatform(args.options.ff) &&
                Validator.isValidAskProfile(args.options['ask-profile'] &&
                Validator.isValidEndpoint(args.options.endpoint));
        })

        .action((args, callback) => {
            let p = Promise.resolve();
            const tasks = new Listr([], {
                renderer: JovoRenderer,
                collapse: false,
            });
            let config = {
                type: args.options.init,
            };


            if (!args.directory) {
                p = p.then(() => {
                    return Prompts.promptNewProject().then((answers) => {
                        args.directory = answers.directory;
                        if (!Validator.isValidProjectName(args.directory)) {
                            callback();
                        } else {
                            return Promise.resolve();
                        }
                    });
                });
            }


            // asks for approval when projectfolder exists
            if (Helper.Project.hasExistingProject(args.directory)) {
                p = p.then(() => {
                    return Prompts.promptOverwriteProject().then((answers) => {
                        if (answers.overwrite === Prompts.ANSWER_CANCEL) {
                            // exit on cancel
                            callback();
                        } else {
                            Helper.Project.deleteExistingFolder(args.directory);
                            return Promise.resolve();
                        }
                    });
                });
            }

            if (args.options.init) {
                if (typeof args.options.init === 'boolean') {
                    p = p.then(() => {
                        return Prompts.promptForPlatform().then((answers) => {
                            config.type = answers.platform;
                            console.log();
                            console.log();
                        });
                    });
                }
            }

            if (args.options.ff) {
                if (typeof args.options.ff === 'boolean') {
                    p = p.then(() => {
                        return Prompts.promptForPlatform().then((answers) => {
                            config.type = answers.platform;
                            console.log();
                            console.log();
                        });
                    });
                }
                config.type = args.options.ff;
            }


            if (args.options.build) {
                p = p.then(() => {
                    if (!args.options.init) {
                        console.log('Please use --init <platform> if you use --build');
                        callback();
                    }
                });
            }
            if (args.options.deploy) {
                p = p.then(() => {
                    if (!args.options.build) {
                        console.log('Please use --build if you use --deploy');
                        callback();
                    }
                    if (!args.options.init) {
                        console.log('Please use --init <platform> if you use --build');
                        callback();
                    }
                });
            }

            p = p.then(() => {
                console.log('  I\'m setting everything up');
                console.log();
                _.merge(config, {
                    projectname: args.directory,
                    locales: Helper.Project.getLocales(args.options.locale),
                    template: args.options.template || Helper.DEFAULT_TEMPLATE,
                    invocation: args.options.invocation,
                    endpoint: args.options.endpoint || Helper.DEFAULT_ENDPOINT,
                    askProfile: args.options['ask-profile'] || Helper.DEFAULT_ASK_PROFILE,
                });
                Helper.Project.setProjectPath(args.directory);
                config.template = config.template.replace('/', '-');
                tasks.add({
                    title: `Creating new directory /${chalk.white.bold(config.projectname)}`,
                    task: (ctx, task) => {
                        return Helper.Project.createEmptyProject(
                            ctx.projectname,
                            ctx.template,
                            ctx.locales[0]);
                    },
                });

                tasks.add({
                    title:
                        `Downloading and extracting template ${chalk.white.bold(config.template)}`,
                    task: (ctx) => {
                        return Helper.Project.downloadAndExtract(
                            ctx.projectname,
                            ctx.template,
                            ctx.locales[0]
                        )
                        .then(() => {
                            return Helper.Project.updateModelLocale(ctx.locales[0]);
                        });
                    },
                });

                // init project
                if (args.options.init || args.options.ff) {
                    // init project
                    tasks.add({
                        title: 'Initializing',
                        task: (ctx) => {
                            return new Listr([initTask()]);
                        },
                    });
                }


                // build project
                if (args.options.build || args.options.ff) {
                    // build project
                    tasks.add({
                        title: 'Building',
                        task: (ctx) => {
                            return new Listr(buildTask(ctx));
                        },
                    });
                }
                // deploy project
                if (args.options.deploy || args.options.ff) {
                    tasks.add({
                        title: 'Deploying',
                        task: (ctx) => {
                            return new Listr(deployTask(ctx));
                        },
                    });
                }

                // install npm dependencies
                tasks.add({
                    title: 'Installing npm dependencies',
                    enabled: () => !args.options['skip-npminstall'],
                    task: () => Helper.Project.runNpmInstall(),
                });
                return Promise.resolve(config);
            });

            p.then((config) => {
                return tasks.run(config).then(() => {
                    console.log();
                    console.log('  Installation completed.');
                    console.log();
                }).catch((err) => {
                    console.error(err);
                });
            });
        });
};
