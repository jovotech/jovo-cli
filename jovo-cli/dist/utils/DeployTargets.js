"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jovo_cli_deploy_lambda_1 = require("jovo-cli-deploy-lambda");
const instances = {};
const AVAILABLE_DEPLOY_TARGETS = [
    jovo_cli_deploy_lambda_1.JovoCliDeployLambda,
];
function createDeployInstance(name) {
    name = name.toString();
    for (let i = 0; i < AVAILABLE_DEPLOY_TARGETS.length; i++) {
        if (AVAILABLE_DEPLOY_TARGETS[i].TARGET_KEY === name) {
            return new AVAILABLE_DEPLOY_TARGETS[i]();
        }
    }
    throw (new Error(`The deploy target "${name}" is not supported!`));
}
function getAllAvailable() {
    const targetNames = [];
    AVAILABLE_DEPLOY_TARGETS.forEach((platform) => {
        targetNames.push(platform.TARGET_KEY);
    });
    return targetNames;
}
exports.getAllAvailable = getAllAvailable;
function get(name) {
    if (!instances.hasOwnProperty(name)) {
        instances[name] = createDeployInstance(name);
    }
    return instances[name];
}
exports.get = get;
//# sourceMappingURL=DeployTargets.js.map