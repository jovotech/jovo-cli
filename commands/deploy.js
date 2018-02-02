#!/usr/bin/env node
'use strict';
const Listr = require('listr');

const Helper = require('./../helper/lmHelper');
const JovoRenderer = require('../utils/jovoRenderer');
const deployTask = require('./tasks').deployTask;
const Validator = require('../utils/validator');


process.on('unhandledRejection', (reason, p) => {
    console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
    // Stack Trace
    console.log(reason.stack);
});


module.exports = function(vorpal) {
    vorpal
        .command('deploy', 'test')
        .description('create new project into given directory')
        .option('-l, --locale <locale>', 'Locale')
        .option('-p, --platform <platform>', 'alexa, dialogflow')
        .option('-t, --target <target>', 'target')
        .option('--ask-profile <askProfile>', 'ask profile')
        .validate(function(args) {
            return Validator.isValidLocale(args.options.locale) &&
                Validator.isValidDeployTarget(args.options.target) &&
                Validator.isValidPlatform(args.options.platform) &&
                Validator.isValidAskProfile(args.options['ask-profile']);
        })
        .action((args) => {
            const tasks = new Listr([], {
                renderer: JovoRenderer,
                collapse: false,
            });
            let config = {
                locales: Helper.Project.getLocales(args.options.locale),
                type: args.options.platform || Helper.Project.getProjectPlatform(),
                target: args.options.target || Helper.DEFAULT_TARGET,
                askProfile: args.options['ask-profile'] || Helper.DEFAULT_ASK_PROFILE,
            };
            tasks.add({
                title: 'Deploying',
                task: (ctx, task) => deployTask(ctx, task),
            });

            tasks.run(config).then(() => {
                console.log();
                console.log('  Deployment completed. You\'re all set');
                console.log();
            }).catch((err) => {
                console.log();
                console.error(err.message);
            });
        })
        .help((args) => {

        });
};
