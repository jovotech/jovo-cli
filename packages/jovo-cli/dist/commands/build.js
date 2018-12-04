#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
const JovoRenderer_1 = require("../utils/JovoRenderer");
const Listr = require("listr");
const Platforms = require("../utils/Platforms");
const Utils_1 = require("../utils/Utils");
const Prompts_1 = require("../utils/Prompts");
const Validator_1 = require("../utils/Validator");
const jovo_cli_core_1 = require("jovo-cli-core");
const tasks_1 = require("./tasks");
const project = jovo_cli_core_1.getProject();
module.exports = (vorpal) => {
    let DEBUG = false;
    const vorpalInstance = vorpal
        .command('build')
        .description('Build platform-specific language models based on jovo models folder.')
        .option('-l, --locale <locale>', 'Locale of the language model.\n\t\t\t\t<en-US|de-DE|etc> Default: en-US')
        .option('-p, --platform <platform>', `Platform \n\t\t\t\t <${Platforms.getAllAvailable().join('|')}>`)
        .option('-d, --deploy', 'Runs deploy after build')
        .option('-r, --reverse', 'Builds Jovo language model from platfrom specific language model')
        .option('-t, --target <target>', 'Target of build \n\t\t\t\t<info|model> Default: all')
        .option('-s, --src <src>', 'Path to source files \n\t\t\t\t Default: <project directory>')
        .option('--stage <stage>', 'Takes configuration from <stage>')
        .option('--endpoint <endpoint>', 'Type of endpoint \n\t\t\t\t<jovo-webhook|bst-proxy|ngrok|none> - Default: jovo-webhook')
        .option('\n');
    Platforms.addCliOptions('build', vorpalInstance);
    Utils_1.addBaseCliOptions(vorpalInstance);
    vorpalInstance
        .validate((args) => {
        if (!Platforms.validateCliOptions('build', args)) {
            return false;
        }
        return Validator_1.isValidLocale(args.options.locale) &&
            Validator_1.isValidPlatform(args.options.platform);
    })
        .action(async (args) => {
        DEBUG = args.options.debug ? true : false;
        await project.init();
        const tasks = new Listr([], {
            renderer: JovoRenderer_1.JovoCliRenderer,
            collapse: false,
        });
        try {
            project.getConfig(args.options.stage);
        }
        catch (e) {
            console.log(`\n\n Could not load ${project.getConfigFileName()}. \n\n`);
            return Promise.resolve();
        }
        const types = [];
        if (args.options.platform) {
            types.push(args.options.platform);
        }
        else {
            types.push.apply(types, Platforms.getAll(args.platform, args.options.stage));
        }
        const config = {
            locales: project.getLocales(args.options.locale),
            types,
            projectId: args.options['project-id'] || project.getConfigParameter('googleAction.dialogflow.projectId', args.options.stage),
            endpoint: args.options.endpoint || jovo_cli_core_1.DEFAULT_ENDPOINT,
            target: args.options.target || jovo_cli_core_1.DEFAULT_TARGET,
            src: args.options.src || project.getConfigParameter('src', args.options.stage) || project.getProjectPath(),
            stage: project.getStage(args.options.stage),
            debug: DEBUG,
            frameworkVersion: project.frameworkVersion,
        };
        let p = Promise.resolve();
        if (!project.hasConfigFile()) {
            if (project.frameworkVersion === 1) {
                if (config.types && config.types.length === 0) {
                    p = p.then(() => {
                        return Prompts_1.promptForInit().then((answers) => {
                            config.types = [answers.platform];
                            console.log();
                            console.log();
                        });
                    });
                }
            }
            else {
                console.error(`The "${project.getConfigPath()}" file is missing or invalid!`);
                return Promise.resolve();
            }
        }
        if (config.types.length !== 1 && args.options.reverse) {
            p = p.then(() => {
                return Prompts_1.promptForInit().then((answers) => {
                    config.types = [answers.platform];
                    console.log();
                    console.log();
                });
            });
        }
        p.then(() => {
            config.types.forEach((type) => {
                const platform = Platforms.get(type);
                _.merge(config, platform.getPlatformConfigValues(project, args));
                if (args.options.reverse) {
                    const platform = Platforms.get(type);
                    config.locales = platform.getLocales(args.options.locale);
                    if (project.hasModelFiles(config.locales)) {
                        p = p.then(() => {
                            return Prompts_1.promptOverwriteReverseBuild().then((answers) => {
                                if (answers.promptOverwriteReverseBuild === Prompts_1.ANSWER_CANCEL) {
                                    p = Promise.resolve();
                                }
                                else {
                                    config.reverse = answers.promptOverwriteReverseBuild;
                                }
                            });
                        });
                    }
                }
            });
        });
        return p.then(() => {
            if (!project.hasConfigFile() && !args.options.reverse) {
                tasks.add(tasks_1.initTask());
            }
            if (args.options.reverse) {
                tasks.add({
                    title: 'Building language model platform model',
                    task: (ctx) => tasks_1.buildReverseTask(ctx),
                });
            }
            else {
                tasks_1.buildTask(config).forEach((t) => tasks.add(t));
                if (args.options.deploy) {
                    tasks.add({
                        title: 'Deploying',
                        task: (ctx) => {
                            return new Listr(tasks_1.deployTask(ctx));
                        },
                    });
                }
            }
            return tasks.run(config).then(() => {
                console.log();
                console.log('  Build completed.');
                console.log();
            }).catch((err) => {
                if (DEBUG === true) {
                    console.error(err);
                }
            });
        });
    });
};
//# sourceMappingURL=build.js.map