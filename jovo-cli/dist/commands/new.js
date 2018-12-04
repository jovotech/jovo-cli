#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
const Listr = require("listr");
const Platforms = require("../utils/Platforms");
const Utils_1 = require("../utils/Utils");
const Validator_1 = require("../utils/Validator");
const chalk = require("chalk");
const Prompts_1 = require("../utils/Prompts");
const Utils = require("../utils/Utils");
const JovoRenderer_1 = require("../utils/JovoRenderer");
const tasks_1 = require("./tasks");
const path = require("path");
const project = require('jovo-cli-core').getProject();
const jovo_cli_core_1 = require("jovo-cli-core");
module.exports = (vorpal) => {
    let DEBUG = false;
    const vorpalInstance = vorpal
        .command('new [directory]')
        .description(`Create a new Jovo project`)
        .option('-t, --template <template>', 'Name of the template. \n\t\t\t\tDefault: helloworld')
        .option('-l, --locale <locale>', 'Locale of the language model.\n\t\t\t\t<en-US|de-DE|etc> Default: en-US')
        .option('-i, --init [platform]', `Runs init after new \n\t\t\t\t<${Platforms.getAllAvailable().join('|')}>`)
        .option('-b, --build [platform]', `Runs build after new/init. \n\t\t\t\t<${Platforms.getAllAvailable().join(' |')}>`)
        .option('-d, --deploy', 'Runs deploy after new/init/build')
        .option('--ff [platform]', 'Fast forward runs --init <platform> --build --deploy')
        .option('--invocation <invocation>', 'Sets the invocation name')
        .option('--skip-npminstall', 'Skips npm install')
        .option('--endpoint <endpoint>', 'Type of endpoint \n\t\t\t\t<jovo-webhook|bst-proxy|ngrok|none> - Default: jovo-webhook')
        .option('--v1', 'Create a JOVO v1 project')
        .option('\n');
    Platforms.addCliOptions('new', vorpalInstance);
    Utils_1.addBaseCliOptions(vorpalInstance);
    const platformFlags = ['ff', 'build'];
    vorpalInstance
        .validate((args) => {
        if (!Platforms.validateCliOptions('new', args)) {
            return false;
        }
        if (args.options.v1) {
            platformFlags.push('init');
        }
        for (let i = 0; i < platformFlags.length; i++) {
            if (args.options[platformFlags[i]]) {
                if (typeof args.options[platformFlags[i]] !== 'boolean') {
                    if (!Validator_1.isValidPlatform(args.options[platformFlags[i]])) {
                        return false;
                    }
                }
            }
        }
        return Validator_1.isValidProjectName(args.directory) &&
            Validator_1.isValidTemplate(args.options.template) &&
            Validator_1.isValidLocale(args.options.locale) &&
            Validator_1.isValidEndpoint(args.options.endpoint);
    })
        .action(async (args) => {
        const frameworkVersion = args.options.v1 ? 1 : 2;
        DEBUG = args.options.debug ? true : false;
        await project.init(frameworkVersion);
        let p = Promise.resolve();
        const tasks = new Listr([], {
            renderer: JovoRenderer_1.JovoCliRenderer,
            collapse: false,
        });
        const config = {
            types: [],
            debug: args.options.debug ? true : false,
        };
        if (!args.directory) {
            p = p.then(() => {
                return Prompts_1.promptNewProject().then((answers) => {
                    args.directory = answers.directory;
                    if (!Validator_1.isValidProjectName(args.directory)) {
                        p = Promise.resolve();
                    }
                    else {
                        return Promise.resolve();
                    }
                });
            });
        }
        if (args.directory && project.hasExistingProject(args.directory)) {
            p = p.then(() => {
                return Prompts_1.promptOverwriteProject().then((answers) => {
                    if (answers.overwrite === Prompts_1.ANSWER_CANCEL) {
                        p = Promise.resolve();
                    }
                    else {
                        Utils.deleteFolderRecursive(path.join(process.cwd(), args.directory));
                        return Promise.resolve();
                    }
                });
            });
        }
        if (args.options.init) {
            if (project.frameworkVersion !== 1) {
                console.error('The "init" option got deprecated and is only available for Jovo Framework v1 projects.');
                return Promise.resolve();
            }
        }
        let platformIsNeeded = false;
        for (let i = 0; i < platformFlags.length; i++) {
            if (args.options.hasOwnProperty(platformFlags[i])) {
                if (typeof args.options[platformFlags[i]] === 'boolean') {
                    platformIsNeeded = true;
                }
                else {
                    config.types = [args.options[platformFlags[i]]];
                    break;
                }
            }
        }
        if (platformIsNeeded === true && config.types.length === 0) {
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
                    p = Promise.resolve();
                }
                if (!args.options.init) {
                    console.log('Please use --init <platform> if you use --build');
                    p = Promise.resolve();
                }
            });
        }
        p = p.then(() => {
            console.log('  I\'m setting everything up');
            console.log();
            _.merge(config, {
                projectname: args.directory,
                locales: project.getLocales(args.options.locale),
                template: args.options.template || jovo_cli_core_1.DEFAULT_TEMPLATE,
                invocation: args.options.invocation,
                endpoint: args.options.endpoint || jovo_cli_core_1.DEFAULT_ENDPOINT,
            });
            config.types.forEach((type) => {
                const platform = Platforms.get(type);
                _.merge(config, platform.getPlatformConfigValues(project, args));
            });
            project.setProjectPath(args.directory);
            config.template = config.template.replace('/', '-');
            tasks.add({
                title: `Creating new directory /${chalk.white.bold(config.projectname)}`,
                task: (ctx, task) => {
                    return project.createEmptyProject();
                },
            });
            tasks.add({
                title: `Downloading and extracting template ${chalk.white.bold(config.template)}`,
                task: (ctx) => {
                    return project.downloadAndExtract(ctx.projectname, ctx.template, ctx.locales[0])
                        .then(() => {
                        return project.updateModelLocale(ctx.locales[0]);
                    });
                },
            });
            if (args.options.init || args.options.ff) {
                tasks.add({
                    title: 'Initializing',
                    task: (ctx) => {
                        return new Listr([tasks_1.initTask()]);
                    },
                });
            }
            if (args.options.build || args.options.ff) {
                tasks.add({
                    title: 'Building',
                    task: (ctx) => {
                        return new Listr(tasks_1.buildTask(ctx));
                    },
                });
            }
            if (args.options.deploy || args.options.ff) {
                tasks.add({
                    title: 'Deploying',
                    task: (ctx) => {
                        return new Listr(tasks_1.deployTask(ctx));
                    },
                });
            }
            tasks.add({
                title: 'Installing npm dependencies',
                enabled: () => !args.options['skip-npminstall'],
                task: () => project.runNpmInstall(),
            });
            return Promise.resolve(config);
        });
        return p.then((config) => {
            return tasks.run(config).then(() => {
                console.log();
                console.log('  Installation completed.');
                console.log();
            }).catch((err) => {
                if (DEBUG === true) {
                    console.error(err);
                }
            });
        });
    });
};
//# sourceMappingURL=new.js.map