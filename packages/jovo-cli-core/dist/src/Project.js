'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const { promisify } = require('util');
const fs = require("fs");
const renameAsync = promisify(fs.rename);
const readFileAsync = promisify(fs.readFile);
const readdirAsync = promisify(fs.readdir);
const existsAsync = promisify(fs.exists);
const mkdirAsync = promisify(fs.mkdir);
const unlinkAsync = promisify(fs.unlink);
const path_1 = require("path");
const AdmZip = require("adm-zip");
const request = require("request");
const child_process_1 = require("child_process");
const _ = require("lodash");
const uuidv4 = require("uuid/v4");
const Utils = require("./Utils");
const Constants_1 = require("./Constants");
class Project {
    constructor() {
        this.projectPath = process.cwd();
        this.frameworkVersion = 2;
    }
    async init(frameworkVersion) {
        if (frameworkVersion === undefined) {
            try {
                const packageVersion = await this.getJovoFrameworkVersion();
                this.frameworkVersion = packageVersion.major;
            }
            catch (e) {
                this.frameworkVersion = 2;
            }
        }
        else {
            this.frameworkVersion = frameworkVersion;
        }
    }
    async downloadAndExtract(projectName, template, locale) {
        const pathToZip = await this.downloadTemplate(projectName, template, locale);
        return await this.unzip(pathToZip, projectName);
    }
    downloadTemplate(projectPath, template, locale) {
        const templateName = template + '_' + locale + '.zip';
        const url = Constants_1.REPO_URL + 'v' + this.frameworkVersion + '/' + templateName;
        if (!fs.existsSync(projectPath)) {
            fs.mkdirSync(projectPath);
        }
        return new Promise((resolve, reject) => {
            request(url)
                .on('response', (res) => {
                if (res.statusCode === 200) {
                    res.pipe(fs.createWriteStream(path_1.join(projectPath, templateName)))
                        .on('close', () => {
                        resolve(path_1.join(projectPath, templateName));
                    });
                }
                else if (res.statusCode === 404) {
                    reject(new Error('Could not find template.'));
                }
                else {
                    reject(new Error('Could not download template.'));
                }
            });
        });
    }
    getConfigContent(stage) {
        let appJsonConfig;
        if (this.frameworkVersion === 1) {
            appJsonConfig = _.cloneDeep(JSON.parse(fs.readFileSync(this.getConfigPath()).toString()));
        }
        else {
            appJsonConfig = _.cloneDeep(require(this.getConfigPath()));
        }
        return appJsonConfig;
    }
    getConfig(stage) {
        let appJsonConfig;
        try {
            appJsonConfig = this.getConfigContent();
            const stg = stage;
            if (_.get(appJsonConfig, `stages["${stg}"]`)) {
                appJsonConfig = _.merge(appJsonConfig, _.get(appJsonConfig, `stages["${stg}"]`));
            }
        }
        catch (error) {
            if (_.get(error, 'constructor.name') === 'SyntaxError') {
                console.log(error);
                throw error;
            }
        }
        return appJsonConfig;
    }
    getConfigPath() {
        return path_1.join(this.projectPath, this.getConfigFileName());
    }
    getConfigFileName() {
        if (this.frameworkVersion === 1) {
            return 'app.json';
        }
        return 'project.js';
    }
    getConfigParameter(path, stage) {
        const config = this.getConfig(stage);
        if (typeof _.get(config, path) === 'undefined') {
            return;
        }
        let val = _.get(config, path);
        if (typeof val === 'string') {
            val = val.replace(/\\/g, '\\\\');
        }
        else if (_.isArray(val) || _.isObject(val)) {
            return val;
        }
        return eval('`' + val + '`');
    }
    hasConfigFile() {
        try {
            require(this.getConfigPath());
            return true;
        }
        catch (error) {
            return false;
        }
    }
    hasExistingProject(directory) {
        return fs.existsSync(path_1.join(process.cwd(), directory));
    }
    hasModelFiles(locales) {
        if (!locales) {
            return false;
        }
        for (const locale of locales) {
            try {
                this.getModel(locale);
                return true;
            }
            catch (err) {
            }
        }
        return false;
    }
    getLocales(locale) {
        if (locale) {
            if (Array.isArray(locale)) {
                return locale;
            }
            else {
                return [locale];
            }
        }
        if (!fs.existsSync(this.getModelsPath())) {
            return [Constants_1.DEFAULT_LOCALE];
        }
        let files;
        try {
            files = fs.readdirSync(this.getModelsPath());
        }
        catch (err) {
            throw err;
        }
        if (files.length === 0) {
            return [Constants_1.DEFAULT_LOCALE];
        }
        const locales = [];
        files.forEach((file) => {
            if (file.length === 10) {
                locales.push(file.substr(0, 5));
            }
            else if (file.length === 7) {
                locales.push(file.substr(0, 2));
            }
        });
        return locales;
    }
    async getModelFileContent(locale) {
        const fileContent = await readFileAsync(this.getModelPath(locale));
        return fileContent.toString();
    }
    getModel(locale) {
        try {
            return require(this.getModelPath(locale));
        }
        catch (error) {
            if (error.code === 'MODULE_NOT_FOUND') {
                throw new Error('Could not find model file for locale: ' + locale);
            }
            throw error;
        }
    }
    backupModel(locale) {
        return new Promise((resolve, reject) => {
            const todayDate = new Date();
            const todayString = todayDate.toISOString().substring(0, 10);
            let target = this.getModelPath(locale).substr(0, this.getModelPath(locale).length - 5);
            target = target + todayString + '.json';
            fs.writeFile(target, JSON.stringify(this.getModel(locale), null, '\t'), (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve();
            });
        });
    }
    getModelPath(locale) {
        return path_1.join(this.getModelsPath(), locale + '.json');
    }
    getPlatformsPath() {
        return path_1.join(this.projectPath, 'platforms');
    }
    getProjectPath() {
        return this.projectPath + path_1.sep;
    }
    getProjectName() {
        return this.projectPath.split(path_1.sep).pop();
    }
    getEndpoint(endpointType) {
        return new Promise((resolve, reject) => {
            if (endpointType === Constants_1.ENDPOINT_BSTPROXY) {
                const home = Utils.getUserHome();
                try {
                    const data = fs.readFileSync(path_1.join(home, '.bst/config'));
                    const bstConfig = JSON.parse(data.toString());
                    const proxyURL = 'https://' + bstConfig.sourceID + '.bespoken.link/webhook';
                    resolve(proxyURL);
                }
                catch (err) {
                    reject(err);
                }
            }
            else if (endpointType === Constants_1.ENDPOINT_JOVOWEBHOOK) {
                const uuid = this.saveJovoWebhookToConfig();
                resolve(Constants_1.JOVO_WEBHOOK_URL + '/' + uuid);
            }
        });
    }
    getOrCreateJovoWebhookId() {
        try {
            const config = this.loadJovoConfig();
            return config.webhook.uuid;
        }
        catch (error) {
            return this.saveJovoWebhookToConfig();
        }
    }
    getEndpointFromConfig(endpoint) {
        if (endpoint === '${JOVO_WEBHOOK_URL}') {
            return Constants_1.JOVO_WEBHOOK_URL + '/' + this.getWebhookUuid();
        }
        return eval('`' + endpoint + '`');
    }
    getWebhookUuid() {
        try {
            return this.loadJovoConfig().webhook.uuid;
        }
        catch (error) {
            throw error;
        }
    }
    getStage(stage) {
        let stg = '';
        if (process.env.STAGE) {
            stg = process.env.STAGE;
        }
        try {
            const appJsonConfig = this.getConfigContent();
            if (_.get(appJsonConfig, 'defaultStage')) {
                stg = eval('`' + _.get(appJsonConfig, 'defaultStage') + '`');
            }
        }
        catch (error) {
            if (_.get(error, 'constructor.name') === 'SyntaxError') {
                console.log(error);
                throw error;
            }
        }
        if (stage) {
            stg = stage;
        }
        return stg;
    }
    async createEmptyProject() {
        const folderExists = await existsAsync(this.projectPath);
        if (folderExists === false) {
            await mkdirAsync(this.projectPath);
        }
        return this.projectPath;
    }
    getModelsPath() {
        return path_1.join(this.projectPath, 'models');
    }
    loadJovoConfig() {
        let data = {};
        try {
            data = fs.readFileSync(path_1.join(Utils.getUserHome(), '.jovo/config'));
        }
        catch (err) {
        }
        return JSON.parse(data.toString());
    }
    updateConfigV1(data) {
        return new Promise((resolve, reject) => {
            let config;
            try {
                config = this.getConfig();
            }
            catch (err) {
                config = {};
            }
            _.extend(config, data);
            fs.writeFile(this.getConfigPath(), JSON.stringify(config, null, '\t'), (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve();
            });
        });
    }
    updateInvocation(invocation, locale) {
        return new Promise((resolve, reject) => {
            try {
                const model = this.getModel(locale);
                model.invocation = invocation;
                this.saveModel(model, locale).then(() => resolve());
            }
            catch (error) {
                reject(error);
            }
        });
    }
    async updateModelLocale(locale) {
        const modelPath = this.getModelsPath();
        const files = await readdirAsync(modelPath);
        let modelFile;
        files.forEach((file) => {
            if (file !== locale + '.json') {
                modelFile = file;
            }
        });
        if (modelFile) {
            return renameAsync(path_1.join(modelPath, modelFile), path_1.join(modelPath, locale + '.json'));
        }
        return;
    }
    async setPlatformDefaults(platform) {
        let locale;
        for (locale of this.getLocales()) {
            let model;
            try {
                model = this.getModel(locale);
            }
            catch (e) {
                throw (new Error('Could not get model!'));
            }
            await platform.setPlatformDefaults(model);
            return await this.saveModel(model, locale);
        }
    }
    runNpmInstall() {
        return new Promise((resolve, reject) => {
            child_process_1.exec('npm install --save', {
                cwd: this.getProjectPath()
            }, (error) => {
                if (error) {
                    console.log(error);
                    reject(error);
                    return;
                }
                resolve();
            });
        }).then(() => this.runNpmInstallVersion());
    }
    runNpmInstallVersion() {
        return new Promise((resolve, reject) => {
            child_process_1.exec('npm install jovo-framework --save', {
                cwd: this.getProjectPath()
            }, (error) => {
                if (error) {
                    console.log(error);
                    reject(error);
                    return;
                }
                resolve();
            });
        });
    }
    async getJovoFrameworkVersion() {
        let major, minor, patch;
        let packagePath, content, packageFile, version;
        try {
            packagePath = path_1.join(this.getProjectPath(), 'package-lock.json');
            content = await readFileAsync(packagePath);
            packageFile = JSON.parse(content);
            if (packageFile.hasOwnProperty('dependencies') && packageFile.dependencies.hasOwnProperty('jovo-framework')) {
                version = packageFile.dependencies['jovo-framework'].version;
                [major, minor, patch] = version.split('.');
            }
        }
        catch (e) {
        }
        if (!major) {
            try {
                packagePath = path_1.join(this.getProjectPath(), 'package.json');
                content = await readFileAsync(packagePath);
                packageFile = JSON.parse(content);
                if (packageFile.hasOwnProperty('dependencies') && packageFile.dependencies.hasOwnProperty('jovo-framework')) {
                    version = packageFile.dependencies['jovo-framework'];
                    const versionMatch = version.match(/(\d+).(\d+).(\d+)/);
                    if (versionMatch) {
                        major = versionMatch[1];
                        minor = versionMatch[2];
                        patch = versionMatch[3];
                    }
                }
            }
            catch (e) {
            }
        }
        if (!major) {
            return Promise.reject(new Error('Could not get "jovo-framework" version!'));
        }
        return {
            major: parseInt(major, 10),
            minor: parseInt(minor, 10),
            patch: parseInt(patch, 10)
        };
    }
    saveModel(model, locale) {
        return new Promise((resolve, reject) => {
            if (!fs.existsSync(this.getModelsPath())) {
                fs.mkdirSync(this.getModelsPath());
            }
            fs.writeFile(this.getModelPath(locale), JSON.stringify(model, null, '\t'), (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve();
            });
        });
    }
    moveTempJovoConfig(pathToSrc) {
        return new Promise((resolve, reject) => {
            const rd = fs.createReadStream(this.getConfigPath());
            rd.on('error', (err) => {
                reject(err);
            });
            const wr = fs.createWriteStream(path_1.join(pathToSrc, 'app.json'));
            wr.on('error', (err) => {
                reject(err);
            });
            wr.on('close', () => {
                resolve();
            });
            rd.pipe(wr);
        });
    }
    deleteTempJovoConfig(pathToSrc) {
        return new Promise((resolve) => {
            fs.unlinkSync(path_1.join(pathToSrc, 'app.json'));
            resolve();
        });
    }
    saveJovoConfig(config) {
        if (!fs.existsSync(path_1.join(Utils.getUserHome(), '.jovo'))) {
            fs.mkdirSync(path_1.join(Utils.getUserHome(), '.jovo'));
        }
        fs.writeFileSync(path_1.join(Utils.getUserHome(), '.jovo/config'), JSON.stringify(config, null, '\t'));
    }
    saveJovoWebhookToConfig() {
        let config;
        try {
            config = this.loadJovoConfig();
            if (!_.get(config, 'webhook.uuid')) {
                _.set(config, 'webhook.uuid', uuidv4());
                this.saveJovoConfig(config);
            }
            return config.webhook.uuid;
        }
        catch (error) {
            config = {
                webhook: {
                    uuid: uuidv4()
                }
            };
            this.saveJovoConfig(config);
            return config.webhook.uuid;
        }
    }
    setProjectPath(projectName) {
        this.projectPath = path_1.join(process.cwd(), projectName);
        return this.projectPath;
    }
    async unzip(pathToZip, pathToFolder) {
        try {
            const zip = new AdmZip(pathToZip);
            zip.extractAllTo(pathToFolder, true);
        }
        catch (err) {
            return Promise.reject(err);
        }
        await unlinkAsync(pathToZip);
        return pathToFolder;
    }
}
exports.Project = Project;
let projectInstance;
function getProject() {
    if (projectInstance === undefined) {
        projectInstance = new Project();
    }
    return projectInstance;
}
exports.getProject = getProject;
//# sourceMappingURL=Project.js.map