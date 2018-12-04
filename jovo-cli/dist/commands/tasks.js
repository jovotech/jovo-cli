"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const Listr = require("listr");
const Platforms = require("../utils/Platforms");
const Prompts_1 = require("../utils/Prompts");
const jovo_cli_core_1 = require("jovo-cli-core");
const DeployTargets = require("../utils/DeployTargets");
const jsonlint = require("jsonlint");
const highlight = require('chalk').white.bold;
const project = jovo_cli_core_1.getProject();
function addPlatfromToConfig(platform) {
    return new Promise((resolve, reject) => {
        const config = project.getConfig() || {};
        platform.addPlatfromToConfig(config);
        fs.writeFile(project.getConfigPath(), JSON.stringify(config, null, '\t'), (err) => {
            if (err) {
                reject(err);
                return;
            }
            resolve();
        });
    });
}
function initTask() {
    let appJsonText = `Creating /app.json`;
    if (project.hasConfigFile()) {
        appJsonText = `Updating /app.json`;
    }
    return {
        title: appJsonText,
        task: (ctx, task) => {
            let platform;
            const tasks = [];
            ctx.types.forEach((type) => {
                platform = Platforms.get(type);
                tasks.push.apply(tasks, [
                    {
                        title: `Adding ${highlight(type)} as platform`,
                        task: (ctx, task) => {
                            return addPlatfromToConfig(platform);
                        },
                    }, {
                        title: `Adding platform specific properties to Jovo-Model`,
                        task: (ctx, task) => {
                            return project.setPlatformDefaults(platform);
                        },
                    }, {
                        title: `Adding ${highlight(ctx.endpoint)} as endpoint`,
                        enabled: (ctx) => ctx.endpoint !== jovo_cli_core_1.ENDPOINT_NONE,
                        task: (ctx, task) => {
                            let info = 'Info: ';
                            const p = Promise.resolve();
                            return p.then(() => project.getEndpoint(ctx.endpoint))
                                .then((uri) => {
                                info += 'Endpoint uri: ' + uri;
                                task.skip(info);
                                return project.updateConfigV1({ endpoint: uri });
                            }).catch((error) => {
                                info += error.message;
                                task.skip(info);
                            });
                        },
                    },
                ]);
            });
            return new Listr(tasks);
        },
    };
}
exports.initTask = initTask;
function getTask(ctx) {
    const platformsPath = project.getPlatformsPath();
    if (!fs.existsSync(platformsPath)) {
        fs.mkdirSync(platformsPath);
    }
    const returnTasks = [];
    let platform;
    ctx.types.forEach((type) => {
        platform = Platforms.get(type);
        returnTasks.push.apply(returnTasks, platform.getGetTasks(ctx));
    });
    return returnTasks;
}
exports.getTask = getTask;
function buildTask(ctx) {
    const platformsPath = project.getPlatformsPath();
    if (!fs.existsSync(platformsPath)) {
        fs.mkdirSync(platformsPath);
    }
    const buildPlatformTasks = [];
    const validationTasks = [];
    let modelFileContent;
    project.getLocales(ctx.locales).forEach((locale) => {
        validationTasks.push({
            title: locale,
            task: async (ctx, task) => {
                try {
                    modelFileContent = await project.getModelFileContent(locale);
                }
                catch (error) {
                    if (error.code === 'ENOENT') {
                        return Promise.reject(new Error(`Language model file could not be found. Expected location: "${error.path}"`));
                    }
                    throw (error);
                }
                try {
                    jsonlint.parse(modelFileContent);
                }
                catch (error) {
                    return Promise.reject(new Error(error.message));
                }
                return Promise.resolve();
            }
        });
    });
    buildPlatformTasks.push({
        title: 'Validate Model-Files',
        task: (ctx, task) => {
            return new Listr(validationTasks);
        }
    });
    let platform;
    ctx.types.forEach((type) => {
        platform = Platforms.get(type);
        buildPlatformTasks.push.apply(buildPlatformTasks, platform.getBuildTasks(ctx));
    });
    return buildPlatformTasks;
}
exports.buildTask = buildTask;
function buildReverseTask(ctx) {
    const buildReverseSubtasks = [];
    buildReverseSubtasks.push({
        title: 'Creating backups',
        enabled: (ctx) => ctx.reverse === Prompts_1.ANSWER_BACKUP,
        task: (ctx) => {
            const backupLocales = [];
            for (const locale of ctx.locales) {
                backupLocales.push({
                    title: locale,
                    task: () => {
                        return project.backupModel(locale);
                    },
                });
            }
            return new Listr(backupLocales);
        },
    });
    let platform;
    ctx.types.forEach((type) => {
        platform = Platforms.get(type);
        buildReverseSubtasks.push.apply(buildReverseSubtasks, platform.getBuildReverseTasks(ctx));
    });
    return new Listr(buildReverseSubtasks);
}
exports.buildReverseTask = buildReverseTask;
function deployTask(ctx) {
    const platformsPath = project.getPlatformsPath();
    if (!fs.existsSync(platformsPath)) {
        fs.mkdirSync(platformsPath);
    }
    const targets = [];
    let targetNames = [];
    if (ctx.target && ![jovo_cli_core_1.TARGET_INFO, jovo_cli_core_1.TARGET_MODEL].includes(ctx.target)) {
        if (ctx.target === jovo_cli_core_1.TARGET_ALL) {
            targetNames = DeployTargets.getAllAvailable();
        }
        else {
            targetNames = [ctx.target];
        }
    }
    targetNames.forEach((targetName) => {
        targets.push(DeployTargets.get(targetName));
    });
    const deployPlatformTasks = [];
    let platform;
    ctx.types.forEach((type) => {
        platform = Platforms.get(type);
        deployPlatformTasks.push.apply(deployPlatformTasks, platform.getDeployTasks(ctx, targets));
    });
    return deployPlatformTasks;
}
exports.deployTask = deployTask;
//# sourceMappingURL=tasks.js.map