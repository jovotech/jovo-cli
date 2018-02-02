'use strict';
const Helper = require('./lmHelper');
const path = require('path');

module.exports = {
    /**
     * Returns base path to Alexa Skill
     * @return {string}
     */
    getPath: function() {
        return Helper.Project.getProjectPath() + 'platforms' + path.sep + 'googleAction';
    },
};
