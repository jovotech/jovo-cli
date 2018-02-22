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
});


module.exports = function(vorpal) {
    vorpal
        .command('deploy')
        .description('Deploys the project to the voice platform.')
        .option('-l, --locale <locale>',
            'Locale of the language model.\n\t\t\t\t<en-US|de-DE|etc> Default: en-US')
        .option('-p, --platform <platform>',
            'Platform \n\t\t\t\t <alexaSkill|googleAction>')
        .option('-t, --target <target>',
            'Target of deployment \n\t\t\t\t<info|model|lambda|all> Default: all')
        .option('--project-id <projectId>',
            'Project ID of Dialogflow agent')
        .option('\n')
        .option('--ask-profile <askProfile>',
            'Name of use ASK profile \n\t\t\t\tDefault: default')
        .validate(function(args) {
            return Validator.isValidLocale(args.options.locale) &&
                Validator.isValidDeployTarget(args.options.target) &&
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
                projectId: args.options['project-id'],
                target: args.options.target || Helper.DEFAULT_TARGET,
                askProfile: args.options['ask-profile'] || Helper.DEFAULT_ASK_PROFILE,
            };
            if (config.type.length === 0) {
                console.log(`Couldn't find a platform. Please use init <platform> or get to retrieve platform files.`); // eslint-disable-line
                callback();
            }

            deployTask(config).forEach((t) => tasks.add(t));
            tasks.run(config).then(() => {
                if (tasks.tasks.length > 0) {
                    console.log();
                    console.log('  Deployment completed.');
                    console.log();
                }
            }).catch((err) => {
                console.log();
                console.error(err.message);
            });
        })
        .help((args) => {

        });
};
