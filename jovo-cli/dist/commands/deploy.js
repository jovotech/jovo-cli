#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
const JovoRenderer_1 = require("../utils/JovoRenderer");
const Listr = require("listr");
const Platforms = require("../utils/Platforms");
const DeployTargets = require("../utils/DeployTargets");
const tasks_1 = require("./tasks");
const Utils_1 = require("../utils/Utils");
const Validator_1 = require("../utils/Validator");
const jovo_cli_core_1 = require("jovo-cli-core");
const project = jovo_cli_core_1.getProject();
process.on('unhandledRejection', (reason, p) => {
    console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
});
module.exports = (vorpal) => {
    let DEBUG = false;
    const availableDeployTargets = DeployTargets.getAllAvailable();
    const vorpalInstance = vorpal
        .command('deploy')
        .description('Deploys the project to the voice platform.')
        .option('-l, --locale <locale>', 'Locale of the language model.\n\t\t\t\t<en-US|de-DE|etc> Default: en-US')
        .option('-p, --platform <platform>', `Platform \n\t\t\t\t <${Platforms.getAllAvailable().join('|')}>`)
        .option('-t, --target <target>', `Target of deployment \n\t\t\t\t<info|model|all|${availableDeployTargets.join('|')}> Default: all`)
        .option('--stage <stage>', 'Takes configuration from <stage>')
        .option('-s, --src <src>', 'Path to source files \n\t\t\t\t Default: <project directory>')
        .option('\n');
    Platforms.addCliOptions('deploy', vorpalInstance);
    Utils_1.addBaseCliOptions(vorpalInstance);
    vorpalInstance
        .validate((args) => {
        if (!Platforms.validateCliOptions('deploy', args)) {
            return false;
        }
        return Validator_1.isValidLocale(args.options.locale) &&
            Validator_1.isValidDeployTarget(args.options.target) &&
            Validator_1.isValidPlatform(args.options.platform);
    })
        .action(async (args) => {
        DEBUG = args.options.debug ? true : false;
        await project.init();
        const tasks = new Listr([], {
            renderer: JovoRenderer_1.JovoCliRenderer,
            collapse: false,
        });
        const config = {
            locales: project.getLocales(args.options.locale),
            types: Platforms.getAll(args.options.platform, args.options.stage),
            target: args.options.target || jovo_cli_core_1.DEFAULT_TARGET,
            src: args.options.src || project.getConfigParameter('src', args.options.stage) || project.getProjectPath(),
            stage: project.getStage(args.options.stage),
            debug: args.options.debug ? true : false,
            frameworkVersion: project.frameworkVersion,
        };
        if (config.types.length === 0 && (!config.target || config.target && !availableDeployTargets.includes(config.target))) {
            console.log(`Couldn't find a platform. Please use init <platform> or get to retrieve platform files.`);
            return Promise.resolve();
        }
        config.types.forEach((type) => {
            const platform = Platforms.get(type);
            _.merge(config, platform.getPlatformConfigIds(project, args.options));
            _.merge(config, platform.getPlatformConfigValues(project, args));
        });
        tasks_1.deployTask(config).forEach((t) => tasks.add(t));
        return tasks.run(config).then(() => {
            if (tasks.tasks.length > 0) {
                console.log();
                console.log('  Deployment completed.');
                console.log();
            }
        }).catch((err) => {
            if (DEBUG === true) {
                console.error(err);
            }
        });
    });
};
//# sourceMappingURL=deploy.js.map