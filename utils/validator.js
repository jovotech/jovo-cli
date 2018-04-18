'use strict';

const Helper = require('./../helper/lmHelper');


module.exports = {

    /**
     * Checks validity of platform variable
     * @param {string} platform
     * @return {boolean}
     */
    isValidPlatform: function(platform) {
        if (platform) {
            if (platform !== Helper.PLATFORM_ALEXASKILL &&
                platform !== Helper.PLATFORM_GOOGLEACTION) {
                console.log('Please use a valid platform: (alexaSkill|googleAction)');
                return false;
            }
        }
        return true;
    },
    /**
     * Checks validity of platform variable
     * @param {string} platform
     * @return {boolean}
     */
    isValidPlatformGet: function(platform) {
        if (platform) {
            if (platform !== Helper.PLATFORM_ALEXASKILL) {
                console.log('Currently only "alexaSkill" is available.');
                return false;
            }
        }
        return true;
    },

    /**
     * Checks validity of template variable
     * @param {string} template
     * @return {boolean}
     */
    isValidTemplate: function(template) {
        if (template) {
            let reg = /^[0-9a-zA-Z-/_]+$/;
            if (!reg.test(template)) {
                console.log('Please use a valid template name.');
                return false;
            }
        }
        return true;
    },

    /**
     * Checks validity of locale variable
     * @param {string} locale
     * @return {boolean}
     */
    isValidLocale: function(locale) {
        if (locale) {
            if (!/[a-z]{2}-[A-Z]{2}/.test(locale)) {
                console.log('Please use a valid locale: e.g. en-US, de-DE, en-GB');
                return false;
            }
        }
        return true;
    },

    /**
     * Checks validity of ask profile
     * @param {string} askProfile
     * @return {boolean}
     */
    isValidAskProfile: function(askProfile) {
        if (askProfile) {
            if (askProfile.length === 0) {
                console.log('--ask profile cannot be empty');
                return false;
            }
        }
        return true;
    },

    /**
     * Checks validity of project folder name
     * @param {string} projectName
     * @return {boolean}
     */
    isValidProjectName: function(projectName) {
        // check folder/project name validity
        let reg = /^[0-9a-zA-Z-_]+$/;
        if (!reg.test(projectName)) {
            console.log('Please use a valid folder name.');
            return false;
        }
        return true;
    },

    /**
     * Checks validity of target variable
     * @param {string} target
     * @return {boolean}
     */
    isValidDeployTarget: function(target) {
        if (target) {
            if (target !== Helper.TARGET_ALL &&
                target !== Helper.TARGET_MODEL &&
                target !== Helper.TARGET_LAMBDA &&
                target !== Helper.TARGET_INFO) {
                console.log('Please use a valid target: (model|info|lambda|all)');
                return false;
            }
        }
        return true;
    },

    /**
     * Checks validity of endpoint variable
     * @param {string} endpoint
     * @return {boolean}
     */
    isValidEndpoint: function(endpoint) {
        if (endpoint) {
            if (endpoint !== Helper.ENDPOINT_BSTPROXY &&
                endpoint !== Helper.ENDPOINT_NGROK &&
                endpoint !== Helper.ENDPOINT_JOVOWEBHOOK &&
                endpoint !== Helper.ENDPOINT_NONE) {
                console.log('Please use a valid endpoint: ('+Helper.ENDPOINT_JOVOWEBHOOK+'|'+Helper.ENDPOINT_BSTPROXY+'|'+Helper.ENDPOINT_NGROK+'|'+Helper.ENDPOINT_NGROK+')');
                return false;
            }
        }
        return true;
    },
};
