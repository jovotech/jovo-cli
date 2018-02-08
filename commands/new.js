#!/usr/bin/env node
'use strict';
const Listr = require('listr');
const Helper = require('./../helper/lmHelper');
const Validator = require('./../utils/validator');

const Prompts = require('./../utils/prompts');
const JovoRenderer = require('../utils/jovoRenderer');
const buildTask = require('./tasks').buildTask;
const deployTask = require('./tasks').deployTask;


module.exports = function(vorpal) {
    vorpal
        .command('new <directory>', 'test')
        .description('create new project into given directory')
        .option('-t, --template <templateName>', 'Create new project based on specific template.')
        .option('-l, --locale <locale>', 'Locale')
        .option('-b, --build <platform>', 'alexa, dialogflow')
        .option('-d, --deploy', 'deploy')
        .option('--ff <platform>', 'fast')
        .option('-i, --invocation <invocation>', 'invocation')
        .option('--ask-profile <askProfile>', 'ask profile')
        .option('--endpoint <endpoint>', 'type of endpoint')

        .validate(function(args) {
            return Validator.isValidProjectName(args.directory) &&
                Validator.isValidTemplate(args.options.template) &&
                Validator.isValidLocale(args.options.locale) &&
                Validator.isValidPlatform(args.options.build) &&
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
            // asks for approval when projectfolder exists
            if (Helper.Project.hasExistingProject(args.directory)) {
                p = p.then(() => {
                    return Prompts.promptOverwriteProject().then((answers) => {
                        if (answers.overwrite === Prompts.ANSWER_CANCEL) {
                            // exit on cancel
                            callback();
                        } else {
                            return Promise.resolve();
                        }
                    });
                });
            }

            p = p.then(() => {
                console.log('----------------------------------------------------');
                console.log('  I\'m setting everything up');
                console.log();

                let config = {
                    projectname: args.directory,
                    locales: Helper.Project.getLocales(args.options.locale),
                    template: args.options.template || Helper.DEFAULT_TEMPLATE,
                    type: args.options.build || args.options.ff,
                    invocation: args.options.invocation,
                    endpoint: args.options.endpoint || Helper.DEFAULT_ENDPOINT,
                    askProfile: args.options['ask-profile'] || Helper.DEFAULT_ASK_PROFILE,
                };
                Helper.Project.setProjectPath(args.directory);

                tasks.add({
                    title: 'Creating new directory "'+config.projectname+'"',
                    task: (ctx, task) => {
                        // return Promise.resolve();
                        // task.skip('Info: Created files\n Lorem \n ipsum');
                        return Helper.Project.createEmptyProject(
                            ctx.projectname,
                            ctx.template,
                            ctx.locales[0]);
                        // .then(() => {
                        //     return Helper.Project.updateModelLocale(ctx.locales[0]);
                        // });
                    },
                });

                tasks.add({
                    title: 'Downloading and extracting "'+config.template+'"',
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

                // build project
                if (args.options.build || args.options.ff) {
                    // ask for platform
                    if (typeof config.type === 'boolean' || config.type === Helper.PLATFORM_NONE) {
                        p = p.then(() => {
                            return Prompts.promptForPlatform().then((answers) => {
                                config.type = answers.platform;
                                console.log();
                                console.log();
                            });
                        });
                    }

                    // tasks.add({
                    //     title: 'bla',
                    //     task: () => {
                    //         return new Promise((resolve, reject) => {
                    //             setTimeout(resolve, 2000);
                    //         });
                    //     },
                    // });
                    tasks.add({
                            title: 'Building language model',
                            task: (ctx, task) => buildTask(ctx, task),
                        }
                    );
                }
                // deploy project
                if (args.options.deploy || args.options.ff) {
                    tasks.add({
                        title: 'Deploying',
                        task: (ctx, task) => deployTask(ctx, task),
                    });
                }

                // install npm dependencies
                tasks.add({
                    title: 'Installing NPM dependecies',
                    task: () => Helper.Project.runNpmInstall(),
                    // task: () => Promise.resolve(),

                });

                return Promise.resolve(config);
            });


            p.then((config) => {
                return tasks.run(config).then(() => {
                    console.log();
                    console.log('  Installation completed. You\'re all set');
                    console.log();
                }).catch((err) => {
                    console.error(err);
                });
            }).then(() => {
                console.log('done');
            });
        })
        .help(() => {
            console.log('new HELP');
        });
};
