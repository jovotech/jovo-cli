'use strict';
const inquirer = require('inquirer');


module.exports = {

    ANSWER_OVERWRITE: 'overwrite',
    ANSWER_CANCEL: 'cancel',
    ANSWER_BACKUP: 'backup',
    /**
     * Asks for platform
     * @return {Promise}
     */
    promptForPlatform: function() {
        let questions = [
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
    },

    /**
     * Asks for platform
     * @return {Promise}
     */
    promptForInit: function() {
        let questions = [
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
    },

    /**
     * Asks for Skill ID (list)
     * @param {Array<*>} choices
     * @return {Promise}
     */
    promptListForSkillId: function(choices) {
        let questions = [{
            type: 'list',
            name: 'skillId',
            message: 'Select your skill:',
            paginated: true,
            choices: choices,
        }];
        return inquirer.prompt(questions);
    },


    /**
     * Asks for overwrite confirmation
     * @return {*}
     */
    promptOverwriteProject: function() {
        let questions = [
            {
                type: 'list',
                name: 'overwrite',
                message: 'There is a folder with a same name. What would you like to do?',
                choices: [{
                    value: this.ANSWER_OVERWRITE,
                    name: 'Overwrite',
                }, {
                    value: this.ANSWER_CANCEL,
                    name: 'Cancel',
                },
                ],
            },
        ];
        return inquirer.prompt(questions);
    },

    /**
     * Ask for overwrite Alexa Skill files confirmation
     * @return {*}
     */
    promptOverwriteProjectAlexaSkill: function() {
        let questions = [
            {
                type: 'list',
                name: 'overwrite',
                message: 'Found existing project files. How to proceed?',
                choices: [{
                    value: this.ANSWER_OVERWRITE,
                    name: 'Overwrite',
                }, {
                    value: this.ANSWER_CANCEL,
                    name: 'Cancel',
                },
                ],
            },
        ];
        return inquirer.prompt(questions);
    },

    /**
     * Ask for overwrite Alexa Skill files confirmation
     * @return {*}
     */
    promptOverwriteReverseBuild: function() {
        let questions = [
            {
                type: 'list',
                name: 'promptOverwriteReverseBuild',
                message: 'Found existing model files. How to proceed?',
                choices: [{
                    value: this.ANSWER_OVERWRITE,
                    name: 'Overwrite',
                }, {
                    value: this.ANSWER_BACKUP,
                    name: 'Backup old file and proceed',
                }, {
                    value: this.ANSWER_CANCEL,
                    name: 'Cancel',
                },
                ],
            },
        ];
        return inquirer.prompt(questions);
    },

    /**
     * Ask for project directory name
     * @return {*}
     */
    promptNewProject: function() {
        let questions = [
            {
                type: 'input',
                name: 'directory',
                message: 'Missing argument <directory>. How do you want to name your Jovo project?',
            },
        ];
        return inquirer.prompt(questions);
    },
};


