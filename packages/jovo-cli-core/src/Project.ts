'use strict';

const { promisify } = require('util');

import * as fs from 'fs';
const copyFileAsync = promisify(fs.copyFile);
const renameAsync = promisify(fs.rename);
const readFileAsync = promisify(fs.readFile);
const readdirAsync = promisify(fs.readdir);
const existsAsync = promisify(fs.exists);
const mkdirAsync = promisify(fs.mkdir);
const unlinkAsync = promisify(fs.unlink);
const writeFileAsync = promisify(fs.writeFile);

import { join as pathJoin, sep as pathSep, parse as pathParse } from 'path';
import * as AdmZip from 'adm-zip';
import * as archiver from 'archiver';
import * as request from 'request';
import { exec } from 'child_process';
// TODO: Import only what is needed from lodash!
import * as _ from 'lodash';
import * as uuidv4 from 'uuid/v4';
import * as Utils from './Utils';
import * as Listr from 'listr';
import { ListrTask, ListrTaskWrapper } from 'listr';
import * as tv4 from 'tv4';

import { AppFile, JovoCliPlatform, JovoTaskContext, JovoUserConfig, PackageVersion } from './';
import { ModelValidationError, JovoModelData } from 'jovo-model';
import { JovoConfigReader } from 'jovo-config';

import {
  DEFAULT_LOCALE,
  DEFAULT_TARGET,
  DEPLOY_BUNDLE_DIRECTORY_NAME,
  DEPLOY_ZIP_FILE_NAME,
  ENDPOINT_JOVOWEBHOOK,
  JOVO_WEBHOOK_URL,
  REPO_URL,
} from './Constants';
import { JovoCliError } from './JovoCliError';

export class Project {
  projectPath: string;
  frameworkVersion: number;
  jovoConfigReader: JovoConfigReader | null = null;

  constructor() {
    this.projectPath = process.cwd();
    this.frameworkVersion = 3;
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
        this.frameworkVersion = 3;
      }
    } else {
      this.frameworkVersion = frameworkVersion;
    }

    try {
      const configContent = this.getConfigContent();
      this.jovoConfigReader = new JovoConfigReader(configContent);
    } catch (error) {
      if (_.get(error, 'constructor.name') === 'SyntaxError') {
        console.log(error);
        throw error;
      }
      // There is no project.js file so init empty
      this.jovoConfigReader = new JovoConfigReader({});
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
  async downloadAndExtract(
    projectName: string,
    template: string,
    locale: string,
    language: string,
  ): Promise<string> {
    const pathToZip = await this.downloadTemplate(projectName, template, locale, language);
    return await this.unzip(pathToZip, projectName);
  }

  /**
   * Downloads prepared template from jovo sample apps repo
   *
   * @param {string} projectPath The project name
   * @param {string} template Name of the template
   * @param {string} locale The locale
   * @returns {Promise<string>}
   * @memberof Project
   */
  downloadTemplate(
    projectPath: string,
    template: string,
    locale: string,
    language: string,
  ): Promise<string> {
    const templateName = template + '_' + locale + '.zip';
    const url =
      REPO_URL + 'v' + this.frameworkVersion + '/' + templateName + '?language=' + language;

    if (!fs.existsSync(projectPath)) {
      fs.mkdirSync(projectPath);
    }

    return new Promise((resolve, reject) => {
      request(url).on('response', (res) => {
        if (res.statusCode === 200) {
          res.pipe(fs.createWriteStream(pathJoin(projectPath, templateName))).on('close', () => {
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
  getConfigContent(): AppFile {
    let appJsonConfig;
    if (this.frameworkVersion === 1) {
      // Is JSON file
      appJsonConfig = _.cloneDeep(JSON.parse(fs.readFileSync(this.getConfigPath()).toString()));
    } else {
      // Is JavaScript file

      // Add JOVO_WEBHOOK_URL asg global variable that it does not cause an error when
      // used with backtick

      // @ts-ignore
      global.JOVO_WEBHOOK_URL = JOVO_WEBHOOK_URL + '/' + this.getOrCreateJovoWebhookId();

      appJsonConfig = _.cloneDeep(require(this.getConfigPath()));

      // Remove the global variable again
      // @ts-ignore
      delete global.JOVO_WEBHOOK_URL;
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

      let stg = stage;

      if (stg === undefined && _.get(appJsonConfig, 'defaultStage')) {
        stg = _.get(appJsonConfig, 'defaultStage');
      }

      if (_.get(appJsonConfig, `stages["${stg}"]`)) {
        appJsonConfig = _.merge(appJsonConfig, _.get(appJsonConfig, `stages["${stg}"]`));
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
    return 'project.js';
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
      } catch (err) {}
    }
    return false;
  }

  /**
   * Returns project locales
   *
   * @param {(string | undefined)} locale
   * @returns
   * @memberof Project
   */
  getLocales(locale?: string | string[]): string[] {
    if (locale !== undefined) {
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

    return files
      .filter((file) => {
        // Remove all the backup files
        return !file.match(/\d{4}-\d{2}-\d{2}/);
      })
      .map((file) => pathParse(file).name);
  }

  /**
   * Returns the deploy targets
   *
   * @param {(string | string[])} [command]
   * @param {(string | string[])} [target]
   * @param {string} [stage]
   * @returns {string[]}
   * @memberof Project
   */
  getTargets(command: string, target?: string | string[], stage?: string): string[] {
    if (target !== undefined) {
      if (Array.isArray(target)) {
        return target;
      } else {
        return [target];
      }
    }

    const targets = this.jovoConfigReader!.getConfigParameter(command + '.target', stage);

    if (targets === undefined) {
      return [DEFAULT_TARGET];
    }

    return targets as string[];
  }

  /**
   * Returns the content of the model file
   *
   * @param {string} locale The local of the model
   * @returns {Promise<string>}
   * @memberof Project
   */
  async getModelFileJsonContent(locale: string): Promise<string> {
    const fileContent = await readFileAsync(this.getModelPath(locale, 'json'));
    return fileContent.toString();
  }

  /**
   * Returns jovo model object
   *
   * @param {*} locale
   * @returns
   * @memberof Project
   */
  getModel(locale: string): JovoModelData {
    try {
      return require(this.getModelPath(locale));
    } catch (error) {
      if (error.code === 'MODULE_NOT_FOUND') {
        throw new JovoCliError(`Could not find model file for locale: ${locale}`, 'jovo-cli');
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
  async backupModel(locale: string): Promise<void> {
    // Check if model file is json or JavaScript
    let modelFilePath = this.getModelPath(locale, 'json');
    if (!(await existsAsync(modelFilePath))) {
      modelFilePath = this.getModelPath(locale, 'js');
      if (!(await existsAsync(modelFilePath))) {
        throw new JovoCliError('Model file to backup could not be found.', 'jovo-cli');
      }
    }

    const todayDate = new Date();
    const todayString = todayDate.toISOString().substring(0, 10);

    const target = this.getModelPath(locale);
    const destinationFile = `${target}.${todayString}${pathParse(modelFilePath).ext}`;

    return copyFileAsync(modelFilePath, destinationFile);
  }

  /**
   * Returns model path for the given locale
   *
   * @param {string} locale
   * @returns {string}
   * @memberof Project
   */
  getModelPath(locale: string, fileExtension?: string): string {
    const basePath = pathJoin(this.getModelsPath(), locale);

    if (fileExtension) {
      return basePath + '.' + fileExtension;
    }

    return basePath;
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
   * Returns the path of the bundle zip file
   *
   * @param {JovoTaskContext} ctx
   * @returns {string}
   * @memberof Project
   */
  getZipBundlePath(ctx: JovoTaskContext): string {
    const sourceFolder = ctx.src || this.getProjectPath();
    return pathJoin(sourceFolder, DEPLOY_ZIP_FILE_NAME);
  }

  /**
   * Returns the path of the bundle directory
   *
   * @param {JovoTaskContext} ctx
   * @returns {string}
   * @memberof Project
   */
  getZipBundleDirectoryPath(ctx?: JovoTaskContext): string {
    const sourceFolder = ctx && ctx.src ? ctx.src : this.getProjectPath();
    return pathJoin(sourceFolder, DEPLOY_BUNDLE_DIRECTORY_NAME);
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

    const pathToZip = this.getZipBundlePath(ctx);

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

        exec(
          'npm run bundle',
          {
            cwd: sourceFolder,
          },
          (error) => {
            if (error) {
              reject(error);
              return;
            }
            resolve(pathToZip);
          },
        );
      }
    });
  }

  /**
   * Zips the source folder of the project
   */
  deployTaskZipProjectSource(ctx: JovoTaskContext): ListrTask {
    if (this.frameworkVersion === 1) {
      return {
        title: 'Zip Project ' + Utils.printStage(ctx.stage),
        task: async (ctx: JovoTaskContext, task: ListrTaskWrapper) => {
          const pathToZip = await this.zipSrcFolder(ctx);
          const info = `Zip path: ${pathToZip}`;

          task.skip(info);

          return Promise.resolve();
        },
      };
    }

    const zipPromise = this.zipSrcFolder(ctx);
    let pathToZip: string;
    return {
      title: `Bundle Project` + Utils.printStage(ctx.stage),
      task: (ctx: JovoTaskContext) => {
        return new Listr([
          {
            title: 'Copy source code to "./bundle"',
            task: async (ctx: JovoTaskContext, task: ListrTaskWrapper) => {
              return new Promise((resolve) => {
                setTimeout(() => {
                  resolve();
                }, 1000);
              });
            },
          },
          {
            title: 'Run "npm install --production"',
            task: async (ctx: JovoTaskContext, task: ListrTaskWrapper) => {
              pathToZip = await zipPromise;
              return Promise.resolve();
            },
          },
          {
            title: 'Zip "./bundle" folder',
            task: async (ctx: JovoTaskContext, task: ListrTaskWrapper) => {
              const info = `Zip path: ${pathToZip}`;
              task.skip(info);
              return new Promise((resolve) => {
                setTimeout(() => {
                  resolve();
                }, 500);
              });
            },
          },
        ]);
      },
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
  async isInProjectDirectory(): Promise<boolean> {
    const projectPath = this.getProjectPath();

    if (!(await existsAsync(projectPath + 'package.json'))) {
      return false;
    }

    let packageVersion;
    try {
      packageVersion = await this.getJovoFrameworkVersion();
    } catch (e) {
      return false;
    }

    if (packageVersion.major === 1) {
      if (
        !(await existsAsync(pathJoin(projectPath + 'index.js'))) ||
        !(await existsAsync(pathJoin(projectPath, 'app') + pathSep))
      ) {
        return false;
      }
    } else {
      if (!(await existsAsync(pathJoin(projectPath, 'src') + pathSep))) {
        return false;
      }
    }

    return true;
  }

  /**
   * Gets endpoint uri
   * @param {string} endpointType type of end
   * @return {Promise<any>}
   */
  getEndpoint(endpointType: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (endpointType === ENDPOINT_JOVOWEBHOOK) {
        const uuid = this.saveJovoWebhookToUserConfig();
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
      const config = this.loadJovoUserConfig();
      return config.webhook.uuid;
    } catch (error) {
      return this.saveJovoWebhookToUserConfig();
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
      return this.loadJovoUserConfig().webhook.uuid;
    } catch (error) {
      throw error;
    }
  }

  getStage(stage: string): string {
    if (stage) {
      // If a stage is given always use it no matter what is defined
      // in environment or config
      return stage;
    }

    let stg = '';
    if (process.env.NODE_ENV) {
      stg = process.env.NODE_ENV;
    }
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

  loadJovoUserConfig(): JovoUserConfig {
    let data = {};
    try {
      data = fs.readFileSync(pathJoin(Utils.getUserHome(), '.jovo/config'));
    } catch (err) {
      throw new JovoCliError('The ".jovo/config" file is missing!', 'jovo-cli');
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
        const model: JovoModelData = this.getModel(locale);
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
      let model: JovoModelData;

      try {
        model = this.getModel(locale);
      } catch (e) {
        if (await existsAsync(this.getModelPath(locale, 'js'))) {
          // File is JavaScript not json
          throw new JovoCliError(
            'Model file is Javascript, not JSON, so platform defaults could not be set!',
            'jovo-cli',
          );
        }

        throw new JovoCliError('Could not get model!', 'jovo-cli');
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
      exec(
        'npm install --save',
        {
          cwd: this.getProjectPath(),
        },
        (error) => {
          if (error) {
            console.log(error);
            reject(error);
            return;
          }
          resolve();
        },
      );
    }).then(() => this.runNpmInstallVersion());
  }

  /**
   * Installs jovo-framework with --save parameter to update the version in package.json
   * @return {Promise<any>}
   */
  runNpmInstallVersion(): Promise<void> {
    return new Promise((resolve, reject) => {
      exec(
        'npm install jovo-framework --save',
        {
          cwd: this.getProjectPath(),
        },
        (error) => {
          if (error) {
            console.log(error);
            reject(error);
            return;
          }
          resolve();
        },
      );
    });
  }

  /**
   * Returns if the project is a typescript project
   *
   * @returns
   * @memberof Project
   */
  async isTypeScriptProject(): Promise<boolean> {
    const packagePath = pathJoin(this.getProjectPath(), 'package.json');
    const content = await readFileAsync(packagePath);
    const packageFile = JSON.parse(content);

    if (
      packageFile.hasOwnProperty('devDependencies') &&
      packageFile.devDependencies.hasOwnProperty('typescript')
    ) {
      return true;
    }

    return false;
  }

  /**
   * Compile the TypeScript code of project to JavaScript
   *
   * @param {string} [sourceFolder] Optional source folder, by default uses project path
   * @returns {Promise<void>}
   * @memberof Project
   */
  async compileTypeScriptProject(sourceFolder?: string): Promise<void> {
    sourceFolder = sourceFolder || this.getProjectPath();

    return new Promise((resolve, reject) => {
      exec(
        'npm run tsc',
        {
          cwd: sourceFolder,
        },
        (error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        },
      );
    });
  }

  /**
   * Returns the Jovo Framework version
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
      if (
        packageFile.hasOwnProperty('dependencies') &&
        packageFile.dependencies.hasOwnProperty('jovo-framework')
      ) {
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
        if (
          packageFile.hasOwnProperty('dependencies') &&
          packageFile.dependencies.hasOwnProperty('jovo-framework')
        ) {
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
      major: Number(major),
      minor: Number(minor),
      patch: Number(patch),
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
  async saveModel(model: JovoModelData, locale: string): Promise<void> {
    if (!existsAsync(this.getModelsPath())) {
      await mkdirAsync(this.getModelsPath());
    }

    // Check if model file is json or JavaScript
    const modelFilePath = this.getModelPath(locale, 'json');

    if (!(await existsAsync(modelFilePath))) {
      if (await existsAsync(this.getModelPath(locale, 'js'))) {
        throw new JovoCliError(
          'Model file is Javascript, not JSON, so automatic changes can not be applied.',
          'jovo-cli',
          'To apply automatic changes again, try changing back to .json!',
        );
      }
    }

    await writeFileAsync(modelFilePath, JSON.stringify(model, null, '\t'));
    return;
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

  saveJovoUserConfig(config: JovoUserConfig): void {
    if (!fs.existsSync(pathJoin(Utils.getUserHome(), '.jovo'))) {
      fs.mkdirSync(pathJoin(Utils.getUserHome(), '.jovo'));
    }
    fs.writeFileSync(
      pathJoin(Utils.getUserHome(), '.jovo/config'),
      JSON.stringify(config, null, '\t'),
    );
  }

  /**
   * Validates jovo model
   * @param {*} locale
   */
  validateModel(locale: string, validator: tv4.JsonSchema): void {
    let model: JovoModelData;
    try {
      model = this.getModel(locale);
    } catch (error) {
      if (error.code === 'MODULE_NOT_FOUND') {
        throw new JovoCliError(`Could not find model file for locale "${locale}"!`, 'jovo-cli');
      }
      throw error;
    }

    const valid = tv4.validate(model, validator);

    if (valid === false) {
      throw new ModelValidationError(tv4.error.message, locale, tv4.error.dataPath);
    }
  }

  /**
   * Generates uuid and saves to global Jovo Cli config file
   *
   * @returns {string}
   * @memberof Project
   */
  saveJovoWebhookToUserConfig(): string {
    let config: JovoUserConfig;
    try {
      config = this.loadJovoUserConfig();
      if (!_.get(config, 'webhook.uuid')) {
        _.set(config, 'webhook.uuid', uuidv4());
        this.saveJovoUserConfig(config);
      }
      return config.webhook.uuid;
    } catch (error) {
      config = {
        webhook: {
          uuid: uuidv4(),
        },
      };
      this.saveJovoUserConfig(config);
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
