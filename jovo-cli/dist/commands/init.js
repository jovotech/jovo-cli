#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
const JovoRenderer_1 = require("../utils/JovoRenderer");
const Listr = require("listr");
const Platforms = require("../utils/Platforms");
const Prompts_1 = require("../utils/Prompts");
const tasks_1 = require("./tasks");
const Utils_1 = require("../utils/Utils");
const Validator_1 = require("../utils/Validator");
const jovo_cli_core_1 = require("jovo-cli-core");
const project = require('jovo-cli-core').getProject();
module.exports = (vorpal) => {
    let DEBUG = false;
    const vorpalInstance = vorpal
        .command('init [platform]')
        .description('Initializes platform-specific projects in app.json.')
        .option('-b, --build', 'Runs build after init.')
        .option('-d, --deploy', 'Runs deploy after init/build')
        .option('-l, --locale <locale>', 'Locale of the language model.\n\t\t\t\t<en-US|de-DE|etc> Default: en-US')
        .option('-t, --target <target>', 'Target of build and deployment \n\t\t\t\t<info|model|all> Default: all')
        .option('--endpoint <endpoint>', 'Type of endpoint \n\t\t\t\t<jovo-webhook|bst-proxy|ngrok|none> - Default: jovo-webhook')
        .option('\n');
    Platforms.addCliOptions('init', vorpalInstance);
    Utils_1.addBaseCliOptions(vorpalInstance);
    vorpalInstance
        .validate((args) => {
        if (!Platforms.validateCliOptions('init', args)) {
            return false;
        }
        return Validator_1.isValidPlatform(args.platform) &&
            Validator_1.isValidLocale(args.options.locale) &&
            Validator_1.isValidDeployTarget(args.options.target) &&
            Validator_1.isValidEndpoint(args.options.endpoint);
    })
        .action(async (args) => {
        DEBUG = args.options.debug ? true : false;
        await project.init();
        if (project.frameworkVersion !== 1) {
            console.error('The "init" command got deprecated and is only available for Jovo Framework v1 projects.');
            return Promise.resolve();
        }
        const tasks = new Listr([], {
            renderer: JovoRenderer_1.JovoCliRenderer,
            collapse: false,
        });
        try {
            project.getConfig(args.options.stage);
        }
        catch (e) {
            console.log('\n\n Could not load app.json. \n\n');
            return;
        }
        let p = Promise.resolve();
        const config = {
            types: args.platform ? [args.platform] : [],
            locales: project.getLocales(args.options.locale),
            endpoint: args.options.endpoint || jovo_cli_core_1.DEFAULT_ENDPOINT,
            target: args.options.target || jovo_cli_core_1.DEFAULT_TARGET,
            debug: args.options.debug ? true : false,
            frameworkVersion: project.frameworkVersion,
        };
        if (!args.platform) {
            p = p.then(() => {
                return Prompts_1.promptForPlatform().then((answers) => {
                    config.types = [answers.platform];
                    console.log();
                    console.log();
                });
            });
        }
        if (args.options.deploy) {
            p = p.then(() => {
                if (!args.options.build) {
                    console.log('Please use --build if you use --deploy');
                    return;
                }
            });
        }
        config.types.forEach((type) => {
            const platform = Platforms.get(type);
            _.merge(config, platform.getPlatformConfigValues(project, args));
        });
        return p.then(() => {
            tasks.add(tasks_1.initTask());
            if (args.options.build) {
                tasks.add({
                    title: 'Building',
                    task: (ctx) => {
                        return new Listr(tasks_1.buildTask(ctx));
                    },
                });
            }
            if (args.options.deploy) {
                tasks.add({
                    title: 'Deploying',
                    task: (ctx) => {
                        return new Listr(tasks_1.deployTask(ctx));
                    },
                });
            }
            return tasks.run(config).then(() => {
                console.log();
                console.log('  Initialization completed.');
                console.log();
            }).catch((err) => {
                if (DEBUG === true) {
                    console.error(err);
                }
            });
        });
    });
};
//# sourceMappingURL=init.js.map