'use strict';

const { promisify } = require('util');

import * as fs from 'fs';
const renameAsync = promisify(fs.rename);
const readFileAsync = promisify(fs.readFile);
const readdirAsync = promisify(fs.readdir);
const existsAsync = promisify(fs.exists);
const mkdirAsync = promisify(fs.mkdir);
const unlinkAsync = promisify(fs.unlink);

import { join as pathJoin, sep as pathSep } from 'path';
import * as AdmZip from 'adm-zip';
import * as archiver from 'archiver';
import * as request from 'request';
import { exec } from 'child_process';
// TODO: Import only what is needed from lodash!
import * as _ from 'lodash';
import * as uuidv4 from 'uuid/v4';
import * as Utils from './Utils';
import { ListrTask, ListrTaskWrapper } from 'listr';

import { AppFile, JovoCliPlatform, JovoConfig, JovoTaskContext, JovoModel, PackageVersion } from './';
import { DEFAULT_LOCALE, DEPLOY_ZIP_FILE_NAME, ENDPOINT_BSTPROXY, ENDPOINT_JOVOWEBHOOK, JOVO_WEBHOOK_URL, REPO_URL } from './Constants';


export class Project {

	projectPath: string;
	frameworkVersion: number;

	constructor() {
		this.projectPath = process.cwd();
		this.frameworkVersion = 2;
	}


	/**
	 * Initializes the project
	 *
	 * @param {number} [frameworkVersion] The version of the framework
	 * @returns
	 * @memberof Project
	 */
	async init(frameworkVersion?: number): Promise<void> {
		if (frameworkVersion === undefined) {
			// Get the version automatically from the package-lock file
			try {
				const packageVersion = await this.getJovoFrameworkVersion();
				this.frameworkVersion = packageVersion.major;
			} catch (e) {
				// When no package-lock file got found expect it to be version 2 as it is the default
				this.frameworkVersion = 2;
			}
		} else {
			this.frameworkVersion = frameworkVersion;
		}
	}


    /**
     *  Downloads and automatically extracts a template
     *
     * @param {string} projectName The project name
     * @param {string} template Name of the template
     * @param {string} locale The locale
     * @returns {Promise<string>}
     * @memberof Project
     */
	async downloadAndExtract(projectName: string, template: string, locale: string): Promise<string> {
		const pathToZip = await this.downloadTemplate(projectName, template, locale);
		return await this.unzip(pathToZip, projectName);
	}


    /**
     * Downloads prepared template from jovo sample apps repo
     *
     * @param {string} projectName The project name
     * @param {string} template Name of the template
     * @param {string} locale The locale
     * @returns {Promise<string>}
     * @memberof Project
     */
	downloadTemplate(projectPath: string, template: string, locale: string): Promise<string> {
		const templateName = template + '_' + locale + '.zip';
		const url = REPO_URL + 'v' + this.frameworkVersion + '/' + templateName;

		if (!fs.existsSync(projectPath)) {
			fs.mkdirSync(projectPath);
		}

		return new Promise((resolve, reject) => {
			request(url)
				.on('response', (res) => {
					if (res.statusCode === 200) {
						res.pipe(fs.createWriteStream(pathJoin(projectPath, templateName)))
							.on('close', () => {
								resolve(pathJoin(projectPath, templateName));
							});
					} else if (res.statusCode === 404) {
						reject(new Error('Could not find template.'));
					} else {
						reject(new Error('Could not download template.'));
					}
				});
		});
	}


	/**
	 * Returns the content of the config file
	 */
	getConfigContent(stage?: string): AppFile {
		let appJsonConfig;
		if (this.frameworkVersion === 1) {
			// Is JSON file
			appJsonConfig = _.cloneDeep(JSON.parse(fs.readFileSync(this.getConfigPath()).toString()));
		} else {
			// Is JavaScript file
			appJsonConfig = _.cloneDeep(require(this.getConfigPath()));
		}

		return appJsonConfig;
	}

    /**
     * Returns config file object
     * // TODO: optimize me please
     * @param {string} stage
     * @return {*}
     */
	getConfig(stage?: string): AppFile {
		let appJsonConfig;
		try {
			appJsonConfig = this.getConfigContent();

			const stg = stage;

			if (_.get(appJsonConfig, `stages["${stg}"]`)) {
				appJsonConfig = _.merge(
					appJsonConfig,
					_.get(appJsonConfig, `stages["${stg}"]`));
			}
		} catch (error) {
			if (_.get(error, 'constructor.name') === 'SyntaxError') {
				console.log(error);
				throw error;
			}
		}
		return appJsonConfig;
	}


    /**
     * Returns path to config file
     * @return {string}
     */
	getConfigPath(): string {
		return pathJoin(this.projectPath, this.getConfigFileName());
	}


	/**
	 * Returns the name of the config file of the project
	 *
	 * @returns {string}
	 * @memberof Project
	 */
	getConfigFileName(): string {
		if (this.frameworkVersion === 1) {
			return 'app.json';
		}

		return 'project.js';
	}


    /**
     * Returns config parameter for given path
     * @param {string} path
     * @param {string} stage
     * @return {string}
     */
	getConfigParameter(path: string, stage: string): string | undefined {
		const config: AppFile = this.getConfig(stage);
		if (typeof _.get(config, path) === 'undefined') {
			return;
		}
		let val = _.get(config, path);
		if (typeof val === 'string') {
			val = val.replace(/\\/g, '\\\\');
		} else if (_.isArray(val) || _.isObject(val)) {
			return val;
		}

		return eval('`' + val + '`');
	}



    /**
     * Returns true if app.json exists
     *
     * @returns {boolean}
     * @memberof Project
     */
	hasConfigFile(): boolean {
		try {
			require(this.getConfigPath());
			return true;
		} catch (error) {
			return false;
		}
	}


    /**
     * Checks if given directory name is existing
     *
     * @param {*} directory The directory name
     * @returns {boolean}
     * @memberof Project
     */
	hasExistingProject(directory: string): boolean {
		return fs.existsSync(pathJoin(process.cwd(), directory));
	}


	/**
	 * Checks if model files for given locales exist
	 *
	 * @param {string[]} [locales]
	 * @returns {boolean}
	 * @memberof Project
	 */
	hasModelFiles(locales?: string[]): boolean {
		if (!locales) {
			return false;
		}

		for (const locale of locales) {
			try {
				this.getModel(locale);
				return true;
			} catch (err) {

			}
		}
		return false;
	}


    /**
     * Returns project locale. Takes the first from the
     * models path
     *
     * @param {(string | undefined)} locale
     * @returns
     * @memberof Project
     */
	getLocales(locale?: string | string[]): string[] {
		if (locale) {
			if (Array.isArray(locale)) {
				return locale;
			} else {
				return [locale];
			}
		}
		if (!fs.existsSync(this.getModelsPath())) {
			return [DEFAULT_LOCALE];
		}

		let files: string[];
		try {
			files = fs.readdirSync(this.getModelsPath());
		} catch (err) {
			throw err;
		}

		if (files.length === 0) {
			return [DEFAULT_LOCALE];
		}

		const locales: string[] = [];
		files.forEach((file) => {
			if (file.length === 10) {
				locales.push(file.substr(0, 5));
			} else if (file.length === 7) {
				locales.push(file.substr(0, 2));
			}
		});

		return locales;
	}



	/**
	 * Returns the content of the model file
	 *
	 * @param {string} locale The local of the model
	 * @returns {Promise<string>}
	 * @memberof Project
	 */
	async getModelFileContent(locale: string): Promise<string> {
		const fileContent = await readFileAsync(this.getModelPath(locale));
		return fileContent.toString();
	}



    /**
     * Returns jovo model object
     *
     * @param {*} locale
     * @returns
     * @memberof Project
     */
	getModel(locale: string): JovoModel {
		try {
			return require(this.getModelPath(locale));
		} catch (error) {
			if (error.code === 'MODULE_NOT_FOUND') {
				throw new Error('Could not find model file for locale: ' + locale);
			}
			throw error;
		}
	}


    /**
     * Backups model file
     *
     * @param {*} locale
     * @returns {Promise<void>}
     * @memberof Project
     */
	backupModel(locale: string): Promise<void> {
		return new Promise((resolve, reject) => {
			const todayDate = new Date();
			const todayString = todayDate.toISOString().substring(0, 10);
			let target = this.getModelPath(locale).substr(0, this.getModelPath(locale).length - 5);
			target = target + todayString + '.json';
			// copyFile(this.getModelPath(locale), target);
			fs.writeFile(target, JSON.stringify(this.getModel(locale), null, '\t'), (err) => {
				if (err) {
					reject(err);
					return;
				}
				resolve();
			});
		});
	}


    /**
     * Returns model path for the given locale
     *
     * @param {string} locale
     * @returns {string}
     * @memberof Project
     */
	getModelPath(locale: string): string {
		// /models/{locale}.json
		return pathJoin(this.getModelsPath(), locale + '.json');
	}


    /**
     * Get path to platforms folder
     *
     * @returns {string}
     * @memberof Project
     */
	getPlatformsPath(): string {
		return pathJoin(this.projectPath, 'platforms');
	}


    /**
     * Returns full project path
     *
     * @returns The project path
     * @memberof Project
     */
	getProjectPath(): string {
		return this.projectPath + pathSep;
	}



	/**
	 * Zips the src folder
	 *
	 * @param {JovoTaskContext} ctx Context with information about src to zip
	 * @returns {Promise<string>}
	 * @memberof Project
	 */
	async zipSrcFolder(ctx: JovoTaskContext): Promise<string> {

		const sourceFolder = ctx.src || this.getProjectPath();

		const pathToZip = pathJoin(sourceFolder, DEPLOY_ZIP_FILE_NAME);

		return new Promise<string>((resolve, reject) => {

			if (this.frameworkVersion === 1) {
				// v1 projects have their code here
				const output = fs.createWriteStream(pathToZip);
				const archive = archiver('zip', {
					zlib: {
						level: 9,
					},
				});

				output.on('close', () => {
					resolve(pathToZip);
				});

				archive.on('error', (err) => {
					reject(err);
				});

				archive.pipe(output);
				// append files from a glob pattern
				archive.glob('**/*', {
					cwd: ctx.src,
					ignore: DEPLOY_ZIP_FILE_NAME,
				});

				archive.finalize();
			} else {
				// v2 projects get zipped via build script in package.json

				exec('npm run bundle', {
						cwd: sourceFolder
					},
					(error) => {
						if (error) {
							reject(error);
							return;
						}
						resolve(pathToZip);
					}
				);
			}
		});

	}


	/**
	 * Zips the source folder of the project
	 */
	deployTaskZipProjectSource(ctx: JovoTaskContext): ListrTask {
		return {
			title: 'Zip Project ' + Utils.printStage(ctx.stage),
			task: async (ctx: JovoTaskContext, task: ListrTaskWrapper) => {
				const pathToZip = await this.zipSrcFolder(ctx);
				const info = `Zip path: ${pathToZip}`;

				task.skip(info);

				return Promise.resolve();
			}
		};
	}


    /**
     * Returns project name extracted from project path
     *
     * @returns {(string | undefined)} The project name
     * @memberof Project
     */
	getProjectName(): string | undefined {
		return this.projectPath.split(pathSep).pop();
	}


	/**
	 * Checks if working directory is in a project
	 * @return {boolean}
	 */
	isInProjectDirectory(): boolean {
		return fs.existsSync(this.getProjectPath() + 'index.js') &&
			fs.existsSync(this.getProjectPath() + 'package.json') &&
			fs.existsSync(this.getProjectPath() + 'app' + pathSep);
	}


    /**
     * Gets endpoint uri
     * @param {string} endpointType type of end
     * @return {Promise<any>}
     */
	getEndpoint(endpointType: string): Promise<string> {
		return new Promise((resolve, reject) => {

			if (endpointType === ENDPOINT_BSTPROXY) {
				// const home = process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME'];
				const home = Utils.getUserHome();
				try {
					const data = fs.readFileSync(pathJoin(home, '.bst/config'));
					const bstConfig = JSON.parse(data.toString());
					const proxyURL = 'https://' + bstConfig.sourceID + '.bespoken.link/webhook';

					resolve(proxyURL);
				} catch (err) {
					reject(err);
				}
			} else if (endpointType === ENDPOINT_JOVOWEBHOOK) {
				const uuid = this.saveJovoWebhookToConfig();
				resolve(JOVO_WEBHOOK_URL + '/' + uuid);
			}
		});
	}


    /**
     * Gets or creates Jovo Webhook id
     *
     * @returns {string}
     * @memberof Project
     */
	getOrCreateJovoWebhookId(): string {
		try {
			const config = this.loadJovoConfig();
			return config.webhook.uuid;
		} catch (error) {
			return this.saveJovoWebhookToConfig();
		}
	}


	getEndpointFromConfig(endpoint: string): string {
		if (endpoint === '${JOVO_WEBHOOK_URL}') {
			return JOVO_WEBHOOK_URL + '/' + this.getWebhookUuid();
		}
		return eval('`' + endpoint + '`');
	}


	getWebhookUuid(): string {
		try {
			// @ts-ignore
			return this.loadJovoConfig().webhook.uuid;
		} catch (error) {
			throw error;
		}
	}


	getStage(stage: string): string {
		let stg = '';
		if (process.env.STAGE) {
			stg = process.env.STAGE;
		}
		try {
			const appJsonConfig = this.getConfigContent();
			if (_.get(appJsonConfig, 'defaultStage')) {
				stg = eval('`' + _.get(appJsonConfig, 'defaultStage') + '`');
			}
		} catch (error) {
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



    /**
     * Creates empty project folder
     *
     * @returns The folder path
     * @memberof Project
     */
	async createEmptyProject(): Promise<string> {
		const folderExists = await existsAsync(this.projectPath);

		if (folderExists === false) {
			await mkdirAsync(this.projectPath);
		}

		return this.projectPath;
	}




    /**
     * Returns path to all jovo model files
     *
     * @returns {string}
     * @memberof Project
     */
	getModelsPath(): string {
		return pathJoin(this.projectPath, 'models');
	}


	loadJovoConfig(): JovoConfig {
		let data = {};
		try {
			data = fs.readFileSync(pathJoin(Utils.getUserHome(), '.jovo/config'));
		} catch (err) {

		}
		return JSON.parse(data.toString());
	}





    /**
     * Extends project's app.json
     *
     * @param {object} object
     * @returns {Promise<void>}
     * @memberof Project
     */
	updateConfigV1(data: object): Promise<void> {
		return new Promise((resolve, reject) => {
			let config: AppFile;
			try {
				config = this.getConfig();
			} catch (err) {
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


    /**
     * Updates invocation for model
     *
     * @param {string} invocation
     * @param {string} locale
     * @returns {void}
     * @memberof Project
     */
	updateInvocation(invocation: string, locale: string): Promise<void> {
		return new Promise((resolve, reject) => {
			try {
				const model: JovoModel = this.getModel(locale);
				model.invocation = invocation;
				this.saveModel(model, locale).then(() => resolve());
			} catch (error) {
				reject(error);
			}
		});
	}

    /**
     * Updates model locale file
     * @param {string} locale
     * @return {Promise<any>}
     */
	async updateModelLocale(locale: string): Promise<void> {
		const modelPath = this.getModelsPath();

		const files = await readdirAsync(modelPath);

		let modelFile;
		files.forEach((file: string) => {
			if (file !== locale + '.json') {
				modelFile = file;
			}
		});

		if (modelFile) {
			return renameAsync(pathJoin(modelPath, modelFile), pathJoin(modelPath, locale + '.json'));
		}

		return;
	}


	async setPlatformDefaults(platform: JovoCliPlatform): Promise<void> {

		let locale;
		for (locale of this.getLocales()) {
			let model: JovoModel;
			try {
				model = this.getModel(locale);
			} catch (e) {
				throw (new Error('Could not get model!'));
			}

			await platform.setPlatformDefaults(model);
			return await this.saveModel(model, locale);
		}
	}



    /**
     * Runs npm install
     *
     * @returns {Promise<void>}
     * @memberof Project
     */
	runNpmInstall(): Promise<void> {
		return new Promise((resolve, reject) => {
			exec('npm install --save', {
				cwd: this.getProjectPath()
			},
				(error) => {
					if (error) {
						console.log(error);
						reject(error);
						return;
					}
					resolve();
				});
		}).then(() => this.runNpmInstallVersion());
	}


    /**
     * Installs jovo-framework with --save parameter to update the version in package.json
     * @return {Promise<any>}
     */
	runNpmInstallVersion(): Promise<void> {
		return new Promise((resolve, reject) => {
			exec('npm install jovo-framework --save', {
				cwd: this.getProjectPath()
			},
				(error) => {
					if (error) {
						console.log(error);
						reject(error);
						return;
					}
					resolve();
				});
		});
	}


	/**
	 * Returns the JOVO Framework version
	 *
	 * @returns {Promise<PackageVersion>}
	 * @memberof Project
	 */
	async getJovoFrameworkVersion(): Promise<PackageVersion> {
		let major, minor, patch;
		let packagePath, content, packageFile, version;

		try {
			// Try to get version from package-lock.json as it contains the currently
			// installed package version
			packagePath = pathJoin(this.getProjectPath(), 'package-lock.json');
			content = await readFileAsync(packagePath);
			packageFile = JSON.parse(content);
			if (packageFile.hasOwnProperty('dependencies') && packageFile.dependencies.hasOwnProperty('jovo-framework')) {
				version = packageFile.dependencies['jovo-framework'].version;
				[major, minor, patch] = version.split('.');
			}
		} catch (e) {
			// Something went wrong
		}

		if (!major) {
			try {
				// If no version got found fall back to getting the version from the package.json file
				packagePath = pathJoin(this.getProjectPath(), 'package.json');

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
			} catch (e) {
				// Something went wrong
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


    /**
     * Saves model to file
     *
     * @param {JovoModel} model
     * @param {string} locale
     * @returns {Promise<void>}
     * @memberof Project
     */
	saveModel(model: JovoModel, locale: string): Promise<void> {
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


	moveTempJovoConfig(pathToSrc: string): Promise<void> {
		return new Promise((resolve, reject) => {
			const rd = fs.createReadStream(this.getConfigPath());
			rd.on('error', (err) => {
				reject(err);
			});
			const wr = fs.createWriteStream(pathJoin(pathToSrc, 'app.json'));
			wr.on('error', (err) => {
				reject(err);
			});
			wr.on('close', () => {
				resolve();
			});
			rd.pipe(wr);
		});
	}

	deleteTempJovoConfig(pathToSrc: string): Promise<void> {
		return new Promise((resolve) => {
			fs.unlinkSync(pathJoin(pathToSrc, 'app.json'));
			resolve();
		});
	}

	saveJovoConfig(config: JovoConfig): void {
		if (!fs.existsSync(pathJoin(Utils.getUserHome(), '.jovo'))) {
			fs.mkdirSync(pathJoin(Utils.getUserHome(), '.jovo'));
		}
		fs.writeFileSync(pathJoin(Utils.getUserHome(), '.jovo/config'), JSON.stringify(config, null, '\t'));
	}




	// DOES NOT GET USED ANYWHERE
	// /**
	//  * Validates jovo model
	//  * @param {*} locale
	//  */
	// validateModel(locale) {
	//     let model;
	//     try {
	//         model = this.getModel(locale);
	//     } catch (error) {
	//         if (error.code === 'MODULE_NOT_FOUND') {
	//             throw new Error('Could not find model file for locale "' + locale + '"');
	//         }
	//         throw error;
	//     }

	//     for (let intent of model.intents) {
	//         if (!intent.name) {
	//             throw new Error(`Intents must have "name"`);
	//         }
	//         if (!_.isString(intent.name)) {
	//             throw new Error(`"name" must be type of string`);
	//         }
	//         if (!intent.phrases) {
	//             throw new Error(`Intents must have "phrases"`);
	//         }
	//         if (!_.isArray(intent.phrases)) {
	//             throw new Error(`"phrases" must be type of array`);
	//         }

	//         for (let phrase of intent.phrases) {
	//             let re = /{(.*?)}/g;
	//             let m;
	//             while (m = re.exec(phrase)) {
	//                 if (!intent.inputs) {
	//                     if (!_.isArray(intent.inputs)) {
	//                         throw new Error(`${m[1]} has to be defined in inputs array`);
	//                     }
	//                 }
	//                 let inputs = intent.inputs.filter((item) => {
	//                     if (!item.name) {
	//                         throw new Error(`Input in intent ${intent.name} must have "name"`);
	//                     }
	//                     if (!_.isString(item.name)) {
	//                         throw new Error(`Input name in intent ${intent.name} must of type string`); // eslint-disable-line
	//                     }
	//                     if (!item.type) {
	//                         throw new Error(`Input in intent ${intent.name} must have "type"`);
	//                     }
	//                     if (_.isObject(item.type)) {
	//                         if (!item.type.alexa && !item.type.dialogflow) {
	//                             throw new Error(`Add alexa or/and dialogflow to input ${item.name}`); // eslint-disable-line
	//                         }
	//                     }

	//                     return item.name === m[1];
	//                 });
	//                 if (inputs.length === 0) {
	//                     throw new Error(`Intent ${intent.name}:
	//                     Every parameter in curly brackets has to be in the slots array.`);
	//                 }
	//             }
	//         }
	//     }
	//     if (model.alexa) {
	//         if (Object.keys(model.alexa).length !== 1) {
	//             throw new Error(`alexa must have only one object (interactionModel)`);
	//         }
	//         if (!model.alexa.interactionModel) {
	//             throw new Error(`alexa must have interactionModel object`);
	//         }
	//     }

	//     if (model.inputTypes) {
	//         if (!_.isArray(model.inputTypes)) {
	//             throw new Error('inputTypes must be of type array');
	//         }
	//         for (const inputType of model.inputTypes) {
	//             if (!inputType.name) {
	//                 throw new Error(`Input types must have "name"`);
	//             }
	//             if (!_.isString(inputType.name)) {
	//                 throw new Error(`"name" must be type of string`);
	//             }
	//             if (!inputType.values) {
	//                 throw new Error(`Input types must have "values"`);
	//             }
	//             if (!_.isArray(inputType.values)) {
	//                 throw new Error(`"values" must be type of array`);
	//             }
	//             for (const value of inputType.values) {
	//                 if (!value.value) {
	//                     throw new Error(`Input "${inputType.name}" values must have object with value`); // eslint-disable-line
	//                 }
	//                 if (!_.isString(value.value)) {
	//                     throw new Error(`"value" must be type of string`);
	//                 }
	//                 if (value.synonyms) {
	//                     if (!_.isArray(value.synonyms)) {
	//                         throw new Error(`"synonyms" must be type of array`);
	//                     }
	//                     for (const synonym of value.synonyms) {
	//                         if (!_.isString(synonym)) {
	//                             throw new Error(`"synonym" must be type of string`);
	//                         }
	//                     }
	//                 }
	//             }
	//         }
	//     }
	// }



    /**
     * Generates uuid and saves to global Jovo Cli config file
     *
     * @returns {string}
     * @memberof Project
     */
	saveJovoWebhookToConfig(): string {
		let config: JovoConfig;
		try {
			config = this.loadJovoConfig();
			if (!_.get(config, 'webhook.uuid')) {
				_.set(config, 'webhook.uuid', uuidv4());
				this.saveJovoConfig(config);
			}
			return config.webhook.uuid;
		} catch (error) {
			config = {
				webhook: {
					uuid: uuidv4()
				}
			};
			this.saveJovoConfig(config);
			return config.webhook.uuid;
		}
	}



    /**
     * Set project path
     *
     * @param {*} projectName The name of the project
     * @memberof Project
     */
	setProjectPath(projectName: string): string {
		this.projectPath = pathJoin(process.cwd(), projectName);

		return this.projectPath;
	}


    /**
     * Extracts template to project folder
     * @param {string} pathToZip
     * @param {string} pathToFolder
     * @return {Promise<any>}
     */
	async unzip(pathToZip: string, pathToFolder: string): Promise<string> {
		try {
			const zip = new AdmZip(pathToZip);
			zip.extractAllTo(pathToFolder, true);
		} catch (err) {
			return Promise.reject(err);
		}

		await unlinkAsync(pathToZip);

		return pathToFolder;
	}
}


let projectInstance: Project | undefined;

export function getProject(): Project {
	if (projectInstance === undefined) {
		projectInstance = new Project();
	}

	return projectInstance;
}
