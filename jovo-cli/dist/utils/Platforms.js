"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jovo_cli_platform_alexa_1 = require("jovo-cli-platform-alexa");
const jovo_cli_platform_google_1 = require("jovo-cli-platform-google");
const jovo_cli_core_1 = require("jovo-cli-core");
const project = jovo_cli_core_1.getProject();
const instances = {};
const AVAILABLE_PLATFORMS = [
    jovo_cli_platform_alexa_1.JovoCliPlatformAlexa,
    jovo_cli_platform_google_1.JovoCliPlatformGoogle,
];
function createPlatformInstance(name) {
    name = name.toString();
    for (let i = 0; i < AVAILABLE_PLATFORMS.length; i++) {
        if (AVAILABLE_PLATFORMS[i].PLATFORM_KEY === name) {
            return new AVAILABLE_PLATFORMS[i]();
        }
    }
    throw (new Error(`The platform "${name}" is not supported!`));
}
function getAllAvailable() {
    const platformNames = [];
    AVAILABLE_PLATFORMS.forEach((platform) => {
        platformNames.push(platform.PLATFORM_KEY);
    });
    return platformNames;
}
exports.getAllAvailable = getAllAvailable;
function getAll(platform, stage) {
    if (platform) {
        return [platform];
    }
    const projectPlatforms = [];
    const config = project.getConfig(stage);
    let platformInstance;
    getAllAvailable().forEach((platformName) => {
        platformInstance = get(platformName);
        try {
            if (config.hasOwnProperty(platformName)) {
                projectPlatforms.push(platformName);
            }
        }
        catch (error) {
            if (platformInstance.hasPlatform()) {
                projectPlatforms.push(platformName);
            }
        }
    });
    return projectPlatforms;
}
exports.getAll = getAll;
function get(name) {
    if (!instances.hasOwnProperty(name)) {
        instances[name] = createPlatformInstance(name);
    }
    return instances[name];
}
exports.get = get;
function addCliOptions(command, vorpalCommand) {
    let platformInstance;
    getAllAvailable().forEach((platformName) => {
        platformInstance = get(platformName);
        platformInstance.getAdditionalCliOptions(command, vorpalCommand);
    });
}
exports.addCliOptions = addCliOptions;
function validateCliOptions(command, args) {
    let platformInstance;
    const allPlatforms = getAllAvailable();
    for (let i = 0; i < allPlatforms.length; i++) {
        platformInstance = get(allPlatforms[i]);
        if (!platformInstance.validateAdditionalCliOptions(command, args)) {
            return false;
        }
    }
    return true;
}
exports.validateCliOptions = validateCliOptions;
//# sourceMappingURL=Platforms.js.map