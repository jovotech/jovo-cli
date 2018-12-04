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
const project = jovo_cli_core_1.getProject();
module.exports = (vorpal) => {
    let DEBUG = false;
    const vorpalInstance = vorpal
        .command('get <platform>')
        .description('Downloads an existing platform project into the platforms folder.')
        .option('-l, --locale <locale>', 'Locale of the language model.\n\t\t\t\t<en-US|de-DE|etc> Default: all locales')
        .option('\n')
        .option('-t, --target <target>', 'Type of data that is downloaded. \n\t\t\t\t<info|model|all> Default: all')
        .option('--stage <stage>', 'Takes configuration from <stage>')
        .option('-b, --build', 'Runs build after get. Works only with --reverse')
        .option('-r, --reverse', 'Builds Jovo language model from platfrom specific language model')
        .option('\n');
    Platforms.addCliOptions('get', vorpalInstance);
    Utils_1.addBaseCliOptions(vorpalInstance);
    vorpalInstance
        .validate((args) => {
        if (!Platforms.validateCliOptions('get', args)) {
            return false;
        }
        return Validator_1.isValidLocale(args.options.locale) &&
            Validator_1.isValidDeployTarget(args.options.target);
    })
        .action(async (args) => {
        DEBUG = args.options.debug ? true : false;
        await project.init();
        let p = Promise.resolve();
        const types = [];
        if (args.platform) {
            types.push(args.platform);
        }
        else {
            types.push.apply(types, Platforms.getAll(args.platform, args.options.stage));
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
            return Promise.resolve();
        }
        const config = {
            types,
            debug: DEBUG,
        };
        config.types.forEach((type) => {
            const platform = Platforms.get(type);
            let platformConfigIds = platform.getPlatformConfigIds(project, {});
            if (Object.keys(platformConfigIds).length) {
                p = p.then(() => {
                    return Prompts_1.promptOverwriteProjectFiles().then((answers) => {
                        if (answers.overwrite === Prompts_1.ANSWER_CANCEL) {
                            p = Promise.resolve();
                        }
                        else {
                            return Promise.resolve();
                        }
                    });
                });
            }
            platformConfigIds = platform.getPlatformConfigIds(project, args.options);
            p = p.then(() => {
                _.merge(config, platformConfigIds);
                _.merge(config, platform.getPlatformConfigValues(project, args));
                _.merge(config, {
                    locales: project.getLocales(args.options.locale),
                    target: args.options.target || jovo_cli_core_1.TARGET_ALL,
                    stage: project.getStage(args.options.stage),
                });
                let subp = Promise.resolve();
                if (Object.keys(platformConfigIds).length === 0) {
                    subp = subp
                        .then(() => platform.getExistingProjects(config))
                        .then((choices) => Prompts_1.promptListForSkillId(choices)).then((answers) => {
                        config.skillId = answers.skillId;
                    })
                        .catch((error) => {
                        console.log(error.message);
                        p = subp = Promise.resolve();
                    });
                }
                if (args.options.reverse) {
                    subp = subp.then(() => {
                        try {
                            config.locales = platform.getLocales(args.options.locale);
                        }
                        catch (e) {
                            config.locales = undefined;
                        }
                        if (project.hasModelFiles(config.locales)) {
                            return Prompts_1.promptOverwriteReverseBuild().then((answers) => {
                                if (answers.promptOverwriteReverseBuild ===
                                    Prompts_1.ANSWER_CANCEL) {
                                    p = subp = Promise.resolve();
                                }
                                else {
                                    config.reverse = answers.promptOverwriteReverseBuild;
                                }
                            });
                        }
                    });
                }
                tasks_1.getTask(config).forEach((t) => tasks.add(t));
                return subp.then(() => Promise.resolve(config));
            });
        });
        return p.then((config) => {
            if (args.options.build &&
                args.options.reverse) {
                tasks.add({
                    title: 'Building language model platform model',
                    task: (ctx) => tasks_1.buildReverseTask(ctx),
                });
            }
            return tasks.run(config).then(() => {
                console.log();
                console.log('  Get completed.');
                console.log();
            }).catch((err) => {
                if (DEBUG === true) {
                    console.error(err);
                }
            });
        });
    });
};
//# sourceMappingURL=get.js.map