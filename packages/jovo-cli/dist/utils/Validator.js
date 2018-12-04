"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jovo_cli_core_1 = require("jovo-cli-core");
const deployTargets = require("./DeployTargets");
const platforms = require("./Platforms");
function isValidPlatform(platform) {
    const platformNames = platforms.getAllAvailable();
    if (platform) {
        if (!platformNames.includes(platform)) {
            console.log(`Please use a valid platform: (${platformNames.join('|')})`);
            return false;
        }
    }
    return true;
}
exports.isValidPlatform = isValidPlatform;
function isValidTemplate(template) {
    if (template) {
        const reg = /^[0-9a-zA-Z-/_]+$/;
        if (!reg.test(template)) {
            console.log('Please use a valid template name.');
            return false;
        }
    }
    return true;
}
exports.isValidTemplate = isValidTemplate;
function isValidLocale(locale) {
    if (locale) {
        if (!/[a-z]{2}-[A-Z]{2}/.test(locale)) {
            console.log('Please use a valid locale: e.g. en-US, de-DE, en-GB');
            return false;
        }
    }
    return true;
}
exports.isValidLocale = isValidLocale;
function isValidProjectName(projectName) {
    const reg = /^[0-9a-zA-Z-_]+$/;
    if (!reg.test(projectName)) {
        console.log('Please use a valid folder name.');
        return false;
    }
    return true;
}
exports.isValidProjectName = isValidProjectName;
function isValidDeployTarget(target) {
    if (target) {
        const availableDeployTargets = deployTargets.getAllAvailable();
        if (target !== jovo_cli_core_1.TARGET_ALL &&
            target !== jovo_cli_core_1.TARGET_MODEL &&
            target !== jovo_cli_core_1.TARGET_INFO &&
            !availableDeployTargets.includes(target)) {
            console.log(`Please use a valid target: (model|info|all|${availableDeployTargets.join('|')})`);
            return false;
        }
    }
    return true;
}
exports.isValidDeployTarget = isValidDeployTarget;
function isValidEndpoint(endpoint) {
    if (endpoint) {
        if (endpoint !== jovo_cli_core_1.ENDPOINT_BSTPROXY &&
            endpoint !== jovo_cli_core_1.ENDPOINT_JOVOWEBHOOK &&
            endpoint !== jovo_cli_core_1.ENDPOINT_NONE) {
            console.log('Please use a valid endpoint: (' + jovo_cli_core_1.ENDPOINT_JOVOWEBHOOK + '|' + jovo_cli_core_1.ENDPOINT_BSTPROXY + ')');
            return false;
        }
    }
    return true;
}
exports.isValidEndpoint = isValidEndpoint;
//# sourceMappingURL=Validator.js.map