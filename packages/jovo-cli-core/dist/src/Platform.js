"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const project = require('./Project').getProject();
class JovoCliPlatform {
    constructor() {
    }
    getPlatformConfigIds(project, argOptions) {
        throw new Error(`Method "getPlatformConfigIds" is not implemented for platform "${this.constructor.PLATFORM_KEY}"!`);
    }
    getPlatformConfigValues(project, argOptions) {
        throw new Error(`Method "getPlatformConfigValues" is not implemented for platform "${this.constructor.PLATFORM_KEY}"!`);
    }
    getExistingProjects(config) {
        throw new Error(`Method "getExistingProjects" is not implemented for platform "${this.constructor.PLATFORM_KEY}"!`);
    }
    getAdditionalCliOptions(command, vorpalCommand) {
        throw new Error(`Method "getAdditionalCliOptions" is not implemented for platform "${this.constructor.PLATFORM_KEY}"!`);
    }
    validateAdditionalCliOptions(command, args) {
        throw new Error(`Method "validateAdditionalCliOptions" is not implemented for platform "${this.constructor.PLATFORM_KEY}"!`);
    }
    getLocales(locale) {
        throw new Error(`Method "getLocales" is not implemented for platform "${this.constructor.PLATFORM_KEY}"!`);
    }
    getBuildReverseTasks(ctx) {
        throw new Error(`Method "getBuildReverseTasks" is not implemented for platform "${this.constructor.PLATFORM_KEY}"!`);
    }
    getBuildTasks(ctx) {
        throw new Error(`Method "getBuildTasks" is not implemented for platform "${this.constructor.PLATFORM_KEY}"!`);
    }
    getDeployTasks(ctx, targets) {
        throw new Error(`Method "getDeployTasks" is not implemented for platform "${this.constructor.PLATFORM_KEY}"!`);
    }
    getGetTasks(ctx) {
        throw new Error(`Method "getGetTasks" is not implemented for platform "${this.constructor.PLATFORM_KEY}"!`);
    }
    hasPlatform() {
        throw new Error(`Method "hasPlatform" is not implemented for platform "${this.constructor.PLATFORM_KEY}"!`);
    }
    setPlatformDefaults(model) {
        throw new Error(`Method "setPlatformDefaults" is not implemented for platform "${this.constructor.PLATFORM_KEY}"!`);
    }
    addPlatfromToConfig(config) {
        throw new Error(`Method "addPlatfromToConfig" is not implemented for platform "${this.constructor.PLATFORM_KEY}"!`);
    }
    getPath() {
        return path.join(project.getProjectPath(), 'platforms', this.constructor.PLATFORM_KEY);
    }
}
JovoCliPlatform.PLATFORM_KEY = '';
exports.JovoCliPlatform = JovoCliPlatform;
//# sourceMappingURL=Platform.js.map