"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const _ = require("lodash");
const jovo_cli_core_1 = require("jovo-cli-core");
const chalk = require("chalk");
exports.DEFAULT_ASK_PROFILE = 'default';
function getAskError(method, stderr) {
    const badRequest = 'Error code:';
    stderr = stderr.replace(/[\x00-\x1F\x7F-\x9F]/u, '');
    if (stderr.indexOf(badRequest) > -1) {
        try {
            const json = stderr.substring(stderr.indexOf(badRequest) + badRequest.length + 4);
            const parsedMessage = JSON.parse(json);
            let customError = parsedMessage.message;
            if (parsedMessage.violations) {
                parsedMessage.violations.forEach((violation) => {
                    customError += `\n  ${_.get(violation, 'message')}`;
                });
            }
            return new Error(method + ':' + customError);
        }
        catch (error) {
            return new Error(method + stderr);
        }
    }
    return new Error(stderr);
}
exports.getAskError = getAskError;
function checkAsk() {
    return new Promise((resolve, reject) => {
        child_process_1.exec('ask -v', (error, stdout) => {
            if (error) {
                const msg = 'Jovo requires ASK CLI\n' +
                    'Please read more: https://developer.amazon.com/docs/smapi/quick-start-alexa-skills-kit-command-line-interface.html';
                return reject(new Error(msg));
            }
            const version = stdout.split('.');
            if (parseInt(version[0], 10) >= 1 && parseInt(version[1], 10) >= 1) {
                return resolve();
            }
            return reject(new Error('Please update ask-cli to version >= 1.1.0'));
        });
    });
}
exports.checkAsk = checkAsk;
function prepareSkillList(askSkill) {
    askSkill.skills.sort((a, b) => {
        return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime();
    });
    const map = {
        development: 'dev',
    };
    const choices = [];
    for (const item of askSkill.skills) {
        let message = '';
        const key = Object.keys(item.nameByLocale)[0];
        message += item.nameByLocale[key];
        const stage = map[item.stage] ? map[item.stage] : item.stage;
        message += ' ' + (stage === 'live' ? chalk.green(stage) : chalk.yellow(stage)) + ' ';
        message += '- ' + item.lastUpdated.substr(0, 10);
        message += ' ' + chalk.grey(item.skillId);
        choices.push({
            name: message,
            value: item.skillId,
        });
    }
    return choices;
}
exports.prepareSkillList = prepareSkillList;
function askApiCreateSkill(config, skillJsonPath) {
    return new Promise((resolve, reject) => {
        child_process_1.exec('ask api create-skill -f "' + skillJsonPath + '" --profile ' + config.askProfile, (error, stdout, stderr) => {
            if (error) {
                if (stderr) {
                    return reject(getAskError('askApiCreateSkill', stderr));
                }
            }
            const skillId = stdout.substr(stdout.indexOf('Skill ID: ') + 'Skill ID: '.length, 52).trim();
            resolve(skillId);
        });
    });
}
exports.askApiCreateSkill = askApiCreateSkill;
function askApiListSkills(config) {
    const returnPromise = new Promise((resolve, reject) => {
        child_process_1.exec('ask api list-skills --profile ' + config.askProfile, {}, (error, stdout, stderr) => {
            if (error) {
                if (stderr) {
                    return reject(getAskError('askApiListSkills', stderr));
                }
            }
            resolve(JSON.parse(stdout));
        });
    });
    return returnPromise.then((askSkill) => {
        return Promise.resolve(prepareSkillList(askSkill));
    });
}
exports.askApiListSkills = askApiListSkills;
function askApiUpdateModel(config, modelPath, locale) {
    return new Promise((resolve, reject) => {
        child_process_1.exec('ask api update-model -s ' + config.skillId + ' -f "' + modelPath + '" -l ' + locale + ' --profile ' + config.askProfile, {}, (error, stdout, stderr) => {
            if (error) {
                if (stderr) {
                    return reject(getAskError('askApiUpdateModel', stderr));
                }
            }
            resolve();
        });
    });
}
exports.askApiUpdateModel = askApiUpdateModel;
function askApiUpdateSkill(config, skillJsonPath) {
    return new Promise((resolve, reject) => {
        child_process_1.exec('ask api update-skill -s ' + config.skillId + ' -f "' + skillJsonPath + '" --profile ' + config.askProfile, {}, (error, stdout, stderr) => {
            if (error) {
                if (stderr) {
                    return reject(getAskError('askApiUpdateSkill', stderr));
                }
            }
            resolve();
        });
    });
}
exports.askApiUpdateSkill = askApiUpdateSkill;
function askApiGetSkillStatus(config) {
    return new Promise((resolve, reject) => {
        const command = 'ask api get-skill-status -s ' + config.skillId + ' --profile ' + config.askProfile;
        child_process_1.exec(command, {}, (error, stdout, stderr) => {
            if (error) {
                if (stderr) {
                    return reject(getAskError('askApiGetSkillStatus', stderr));
                }
            }
            try {
                resolve(JSON.parse(stdout));
            }
            catch (error) {
                reject(error);
            }
        });
    });
}
exports.askApiGetSkillStatus = askApiGetSkillStatus;
function askApiGetSkill(config, skillJsonPath) {
    return new Promise((resolve, reject) => {
        child_process_1.exec('ask api get-skill -s ' + config.skillId + ' > "' + skillJsonPath + '" --profile ' + config.askProfile, (error, stdout, stderr) => {
            if (error) {
                if (stderr) {
                    return reject(getAskError('askApiGetSkill', stderr));
                }
            }
            resolve();
        });
    });
}
exports.askApiGetSkill = askApiGetSkill;
function askApiGetModel(config, skillJsonPath, locale) {
    return new Promise((resolve, reject) => {
        child_process_1.exec('ask api get-model -s ' + config.skillId + ' -l ' + locale + ' > "' + skillJsonPath + '" --profile ' + config.askProfile, {}, (error, stdout, stderr) => {
            if (error) {
                if (stderr) {
                    return reject(getAskError('askApiGetModel', stderr));
                }
            }
            resolve();
        });
    });
}
exports.askApiGetModel = askApiGetModel;
function askApiEnableSkill(config) {
    return new Promise((resolve, reject) => {
        child_process_1.exec('ask api enable-skill -s ' + config.skillId + ' --profile ' + config.askProfile, {}, (error, stdout, stderr) => {
            if (error) {
                if (stderr) {
                    return reject(getAskError('askApiEnableSkill', stderr));
                }
            }
            resolve();
        });
    });
}
exports.askApiEnableSkill = askApiEnableSkill;
function askApiGetAccountLinking(config) {
    return new Promise((resolve, reject) => {
        child_process_1.exec('ask api get-account-linking -s ' + config.skillId + ' --profile ' + config.askProfile, {}, (error, stdout, stderr) => {
            if (error) {
                if (stderr && stderr.indexOf('AccountLinking is not present for given skillId') > 0) {
                    resolve();
                }
                else if (stderr) {
                    return reject(getAskError('askApiGetAccountLinking', stderr));
                }
            }
            resolve(stdout);
        });
    });
}
exports.askApiGetAccountLinking = askApiGetAccountLinking;
function getModelStatus(config) {
    return jovo_cli_core_1.Utils.wait(5000).then(() => askApiGetSkillStatus(config)).then((status) => {
        if (_.get(status, `interactionModel.${config.locales[0]}.lastUpdateRequest.status`) === 'IN_PROGRESS') {
            return getModelStatus(config);
        }
        else if (_.get(status, `interactionModel.${config.locales[0]}.lastUpdateRequest.status`) === 'SUCCEEDED') {
            Promise.resolve();
        }
        else {
            Promise.reject();
        }
    });
}
exports.getModelStatus = getModelStatus;
function getSkillStatus(config) {
    return jovo_cli_core_1.Utils.wait(5000).then(() => askApiGetSkillStatus(config)).then((status) => {
        if (_.get(status, `manifest.lastUpdateRequest.status`) === 'IN_PROGRESS') {
            return getSkillStatus(config);
        }
        else if (_.get(status, `manifest.lastUpdateRequest.status`) === 'SUCCEEDED') {
            return Promise.resolve();
        }
        else {
            if (_.get(status, `manifest.lastUpdateRequest.status`) === 'FAILED' &&
                _.get(status, `manifest.lastUpdateRequest.errors[0].message`)) {
                return Promise.reject(new Error(_.get(status, `manifest.lastUpdateRequest.errors[0].message`)));
            }
        }
    });
}
exports.getSkillStatus = getSkillStatus;
//# sourceMappingURL=Ask.js.map