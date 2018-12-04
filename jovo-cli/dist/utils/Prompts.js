"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const inquirer = require("inquirer");
exports.ANSWER_OVERWRITE = 'overwrite';
exports.ANSWER_CANCEL = 'cancel';
exports.ANSWER_BACKUP = 'backup';
function promptForPlatform() {
    const questions = [
        {
            type: 'list',
            name: 'platform',
            message: 'Choose your platform',
            choices: [{
                    value: 'alexaSkill',
                    name: 'Alexa Skill (alexaSkill)',
                }, {
                    value: 'googleAction',
                    name: 'GoogleAction with DialogFlow (googleAction)',
                },
            ],
        },
    ];
    return inquirer.prompt(questions);
}
exports.promptForPlatform = promptForPlatform;
function promptForInit() {
    const questions = [
        {
            type: 'list',
            name: 'platform',
            message: 'To use this command, please first initialize at least one platform with jovo init. You can also choose one here:',
            choices: [{
                    value: 'alexaSkill',
                    name: 'Alexa Skill (alexaSkill)',
                }, {
                    value: 'googleAction',
                    name: 'GoogleAction with DialogFlow (googleAction)',
                },
            ],
        },
    ];
    return inquirer.prompt(questions);
}
exports.promptForInit = promptForInit;
function promptListForSkillId(choices) {
    const questions = [{
            type: 'list',
            name: 'skillId',
            message: 'Select your skill:',
            paginated: true,
            choices,
        }];
    return inquirer.prompt(questions);
}
exports.promptListForSkillId = promptListForSkillId;
function promptOverwriteProject() {
    const questions = [
        {
            type: 'list',
            name: 'overwrite',
            message: 'There is a folder with a same name. What would you like to do?',
            choices: [{
                    value: exports.ANSWER_OVERWRITE,
                    name: 'Overwrite',
                }, {
                    value: exports.ANSWER_CANCEL,
                    name: 'Cancel',
                },
            ],
        },
    ];
    return inquirer.prompt(questions);
}
exports.promptOverwriteProject = promptOverwriteProject;
function promptOverwriteProjectFiles() {
    const questions = [
        {
            type: 'list',
            name: 'overwrite',
            message: 'Found existing project files. How to proceed?',
            choices: [{
                    value: exports.ANSWER_OVERWRITE,
                    name: 'Overwrite',
                }, {
                    value: exports.ANSWER_CANCEL,
                    name: 'Cancel',
                },
            ],
        },
    ];
    return inquirer.prompt(questions);
}
exports.promptOverwriteProjectFiles = promptOverwriteProjectFiles;
function promptOverwriteReverseBuild() {
    const questions = [
        {
            type: 'list',
            name: 'promptOverwriteReverseBuild',
            message: 'Found existing model files. How to proceed?',
            choices: [{
                    value: exports.ANSWER_OVERWRITE,
                    name: 'Overwrite',
                }, {
                    value: exports.ANSWER_BACKUP,
                    name: 'Backup old file and proceed',
                }, {
                    value: exports.ANSWER_CANCEL,
                    name: 'Cancel',
                },
            ],
        },
    ];
    return inquirer.prompt(questions);
}
exports.promptOverwriteReverseBuild = promptOverwriteReverseBuild;
function promptNewProject() {
    const questions = [
        {
            type: 'input',
            name: 'directory',
            message: 'Missing argument <directory>. How do you want to name your Jovo project?',
        },
    ];
    return inquirer.prompt(questions);
}
exports.promptNewProject = promptNewProject;
//# sourceMappingURL=Prompts.js.map