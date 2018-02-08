#!/usr/bin/env node
'use strict';
const Listr = require('listr');

const JovoRenderer = require('../utils/jovoRenderer');
const initTask = require('./tasks').initTask;
const Validator = require('../utils/validator');
const Helper = require('../helper/lmHelper');

module.exports = function(vorpal) {
    vorpal
        .command('init <platform>', 'test')
        .description('create new project into given directory')
        .option('-e, --endpoint <endpoint>', 'type of endpoint')
        .validate(function(args) {
            return Validator.isValidPlatform(args.platform) &&
                Validator.isValidEndpoint(args.options.endpoint);
        })
        .action((args) => {
            const tasks = new Listr([], {
                renderer: JovoRenderer,
                collapse: false,
            });

            let config = {
                type: args.platform,
                endpoint: args.options.endpoint || Helper.DEFAULT_ENDPOINT,
            };
            tasks.add(
                {
                    title: 'Init app.json',
                    task: (ctx) => initTask(ctx),
                }
            );

            tasks.run(config).then(() => {
                console.log();
                console.log('  Initialization completed. You\'re all set');
                console.log();
            }).catch((err) => {
                console.log();
                console.error(err.message);
            });
        })
        .help((args) => {

        });
};
