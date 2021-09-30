'use strict';

import { flags } from '@oclif/command';
import * as DialogFlowUtil from './DialogflowUtil';
import * as GoogleActionUtil from './GoogleActionUtil';

import { join as pathJoin, sep as pathSep } from 'path';
const _ = require('lodash');
import * as fs from 'fs';
import * as inquirer from 'inquirer';
import * as listr from 'listr';
import { ListrTask, ListrTaskWrapper } from 'listr';
const highlight = require('chalk').white.bold;
const subHeadline = require('chalk').white.dim;

import {
  AppFile,
  InputFlags,
  JovoCliDeploy,
  JovoCliPlatform,
  OutputFlags,
  Project,
  Utils,
  JovoCliError,
} from 'jovo-cli-core';
import { JovoModelData, NativeFileInformation } from 'jovo-model';
import { JovoModelDialogflow } from 'jovo-model-dialogflow';
import { AppFileDialogFlow, JovoTaskContextGoogle } from '.';

import { promisify } from 'util';
const writeFile = promisify(fs.writeFile);

const project: Project = require('jovo-cli-core').getProject();

export class JovoCliPlatformGoogle extends JovoCliPlatform {
  static NLU_KEY = 'dialogflow';
  static PLATFORM_KEY = 'googleAction';
  static ID_KEY = 'projectId';

  /**
   * Constructor
   * Config with locale information
   * @param {*} config
   */
  constructor() {
    super();
  }

  /**
   * Return platfrom specific config id
   *
   * @param {Project} project The project
   * @param {ArgOptions} [options] CLI arguments
   * @returns {object}
   * @memberof JovoCliPlatform
   */
  getPlatformConfigIds(project: Project, options: OutputFlags): object {
    try {
      let projectId;
      if (options && options.hasOwnProperty('project-id') && options['project-id']) {
        projectId = options['project-id'];
      } else {
        projectId = project.jovoConfigReader!.getConfigParameter(
          'googleAction.dialogflow.projectId',
          options && (options.stage as string),
        );
      }

      const returnValue = {};
      if (projectId) {
        // @ts-ignore
        returnValue.projectId = projectId;
      }

      return returnValue;
    } catch (error) {
      return {};
    }
  }

  /**
   * Return platfrom specific platfrom values
   *
   * @param {Project} project The project
   * @param {ArgOptions} [options] CLI arguments
   * @returns {object}
   * @memberof JovoCliPlatform
   */
  getPlatformConfigValues(project: Project, options: OutputFlags): object {
    // allow access to ASK profile (for lambda upload)
    let askProfile;
    if (options && options.hasOwnProperty('ask-profile') && options['ask-profile']) {
      askProfile = options['ask-profile'];
    }

    return {
      askProfile:
        askProfile ||
        project.jovoConfigReader!.getConfigParameter(
          'host.lambda.ask-Profile',
          options && (options.stage as string),
        ) ||
        project.jovoConfigReader!.getConfigParameter(
          'host.lambda.askProfile',
          options && (options.stage as string),
        ) ||
        process.env.ASK_DEFAULT_PROFILE,
    };
  }

  /**
   * Returns the validator to check if the platform specific properties are valid
   *
   * @returns {tv4.JsonSchema}
   * @memberof JovoCliPlatformGoogle
   */
  getModelValidator(): tv4.JsonSchema {
    return JovoModelDialogflow.getValidator();
  }

  /**
   * Returns existing projects of user
   *
   * @param {AppFile} config Configuration file
   * @returns {Promise<object>}
   * @memberof JovoCliPlatform
   */
  async getExistingProjects(config: AppFile): Promise<inquirer.ChoiceType[]> {
    return DialogFlowUtil.v2.getProjects();
  }

  getAdditionalCliOptions(command: string, options: InputFlags): void {
    if (['get', 'deploy'].includes(command)) {
      options['project-id'] = flags.string({
        description: 'Google Cloud Project ID',
      });
    }

    if (['deploy'].includes(command)) {
      options['ask-profile'] = flags.string({
        description: 'Name of used ASK profile',
      });
    }
  }

  validateAdditionalCliOptions(command: string, options: OutputFlags): boolean {
    return true;
  }

  /**
   * Returns if project already contains Google
   *
   * @returns {boolean}
   * @memberof JovoCliPlatform
   */
  hasPlatform(): boolean {
    try {
      require(DialogFlowUtil.getAgentJsonPath());
      return true;
    } catch (err) {
      return false;
    }
  }

  /**
   * Returns project locales
   *
   * @param {(string | string[])} [locale]
   * @returns {string[]}
   * @memberof JovoCliPlatformGoogle
   */
  getLocales(locale?: string | string[]): string[] {
    const agentJson = DialogFlowUtil.getAgentJson();
    let supportedLanguages = [agentJson.language];

    if (agentJson.supportedLanguages) {
      supportedLanguages = supportedLanguages.concat(agentJson.supportedLanguages);
    }

    return supportedLanguages;
  }

  /**
   * Set platform defaults on model
   *
   * @param {JovoModelData} model The model to set the data on
   * @returns {JovoModelData}
   * @memberof JovoCliPlatform
   */
  setPlatformDefaults(model: JovoModelData): JovoModelData {
    _.set(model, 'dialogflow.intents', DialogFlowUtil.getDefaultIntents());
    return model;
  }

  /**
   * Add Google to configuration file
   *
   * @param {AppFile} config
   * @returns {AppFile}
   * @memberof JovoCliPlatform
   */
  addPlatfromToConfig(config: AppFileDialogFlow): AppFileDialogFlow {
    if (!config.googleAction) {
      _.extend(config, {
        googleAction: {
          nlu: {
            name: 'dialogflow',
          },
        },
      });
    }

    return config;
  }

  /**
   * Gets tasks to build platform specific language model
   *
   * @param {JovoTaskContextGoogle} ctx The Context
   * @returns {ListrTask[]}
   * @memberof JovoCliPlatform
   */
  getBuildTasks(ctx: JovoTaskContextGoogle): ListrTask[] {
    // const returnTasks: listr[] = [];
    const returnTasks: ListrTask[] = [];

    const googleActionPath = GoogleActionUtil.getPath();
    if (!fs.existsSync(googleActionPath)) {
      fs.mkdirSync(googleActionPath);
    }
    const dialogFlowPath = DialogFlowUtil.getPath();
    if (!fs.existsSync(dialogFlowPath)) {
      fs.mkdirSync(dialogFlowPath);
    }
    const hasGoogleActionDialogflow = this.hasPlatform();
    let title = 'Creating Google Action project files ' + Utils.printStage(ctx.stage);
    let titleAgentJson = 'Creating Dialogflow Agent';
    let titleInteractionModel = 'Creating Language Model';

    if (hasGoogleActionDialogflow) {
      title = 'Updating Google Action project files ' + Utils.printStage(ctx.stage);
      titleAgentJson = 'Updating Dialogflow Agent';
      titleInteractionModel = 'Updating Language Model';
    }
    title += '\n' + subHeadline('   Path: ./platforms/googleAction');
    titleAgentJson += '\n' + subHeadline('   Path: ./platforms/googleAction/dialogflow');
    titleInteractionModel +=
      '\n' +
      subHeadline(
        '   Path: ./platforms/googleAction/dialogflow/intents, ./platforms/googleAction/dialogflow/entities',
      );

    returnTasks.push({
      title,
      task: () => {
        const buildSubTasks = [
          {
            title: titleAgentJson,
            task: (ctx: JovoTaskContextGoogle) => {
              return new listr([
                {
                  title: 'agent.json',
                  task: () => {
                    return Promise.resolve();
                  },
                },
                {
                  title: 'package.json',
                  task: (ctx: JovoTaskContextGoogle) => {
                    return DialogFlowUtil.buildDialogFlowAgent(ctx).then(() => Utils.wait(500));
                  },
                },
              ]);
            },
          },
          {
            title: titleInteractionModel,
            task: (ctx: JovoTaskContextGoogle) => {
              const buildLocalesTasks: ListrTask[] = [];
              // delete old folder
              if (fs.existsSync(DialogFlowUtil.getIntentsFolderPath())) {
                fs.readdirSync(DialogFlowUtil.getIntentsFolderPath()).forEach((file, index) => {
                  // eslint-disable-line
                  const curPath = pathJoin(DialogFlowUtil.getIntentsFolderPath(), file); // eslint-disable-line
                  fs.unlinkSync(curPath);
                });
              }

              if (fs.existsSync(DialogFlowUtil.getEntitiesFolderPath())) {
                fs.readdirSync(DialogFlowUtil.getEntitiesFolderPath()).forEach((file, index) => {
                  // eslint-disable-line
                  const curPath = pathJoin(DialogFlowUtil.getEntitiesFolderPath(), file); // eslint-disable-line
                  fs.unlinkSync(curPath);
                });
              }
              if (ctx.locales) {
                for (const locale of ctx.locales) {
                  buildLocalesTasks.push({
                    title: locale,
                    task: async () => {
                      await this.transform(locale, ctx.stage);
                      return Promise.resolve().then(() => Utils.wait(500));
                    },
                  });
                }
              }
              return new listr(buildLocalesTasks);
            },
          },
        ];
        // return Promise.resolve();
        return new listr(buildSubTasks);
      },
    });

    return returnTasks;
  }

  /**
   * Get tasks to get existing platform project
   *
   * @param {JovoTaskContextGoogle} ctx The Context
   * @returns {ListrTask[]}
   * @memberof JovoCliPlatform
   */
  getGetTasks(ctx: JovoTaskContextGoogle): ListrTask[] {
    const googleActionPath = GoogleActionUtil.getPath();
    if (!fs.existsSync(googleActionPath)) {
      fs.mkdirSync(googleActionPath);
    }

    const dialogflowPath = DialogFlowUtil.getPath();
    if (!fs.existsSync(dialogflowPath)) {
      fs.mkdirSync(dialogflowPath);
    }

    return [
      {
        title: 'Getting Dialogflow Agent files and saving to /platforms/googleAction/dialogflow',
        task: (ctx: JovoTaskContextGoogle) => {
          const keyFile = project.jovoConfigReader!.getConfigParameter(
            'googleAction.dialogflow.keyFile',
            ctx.stage,
          );
          let p = Promise.resolve();
          if (keyFile) {
            if (!fs.existsSync(process.cwd() + pathSep + keyFile)) {
              throw new JovoCliError(
                `Keyfile ${process.cwd() + pathSep + keyFile} does not exist.`,
                'jovo-cli-platform-google',
              );
            }
            ctx.keyFile = process.cwd() + pathSep + keyFile;
            p = p.then(() => DialogFlowUtil.v2.activateServiceAccount(ctx));
          }

          p = p.then(() => DialogFlowUtil.getAgentFiles(ctx));
          return p;
        },
      },
    ];
  }

  /**
   * Get tasks to build Jovo language model from platform
   * specific language model
   *
   * @param {JovoTaskContextGoogle} ctx The Context
   * @returns {ListrTask[]}
   * @memberof JovoCliPlatform
   */
  getBuildReverseTasks(ctx: JovoTaskContextGoogle): ListrTask[] {
    const returnTasks: ListrTask[] = [];

    returnTasks.push({
      title: 'Reversing model files',
      task: (ctx: JovoTaskContextGoogle) => {
        const reverseLocales: ListrTask[] = [];

        const supportedLanguages = this.getLocales();

        for (let locale of supportedLanguages) {
          reverseLocales.push({
            title: locale,
            task: async () => {
              const jovoModel = await this.reverse(locale);

              // transform en-us to en-US
              if (locale.length === 5) {
                locale = locale.substr(0, 2) + '-' + locale.substr(3).toUpperCase();
              }

              return project.saveModel(jovoModel, locale);
            },
          });
        }
        return new listr(reverseLocales);
      },
    });

    return returnTasks;
  }

  /**
   * Get tasks to deploy project
   *
   * @param {JovoTaskContextGoogle} ctx The Context
   * @param {JovoCliDeploy[]} targets The additional deploy targets
   * @returns {ListrTask[]}
   * @memberof JovoCliPlatform
   */
  getDeployTasks(ctx: JovoTaskContextGoogle, targets: JovoCliDeploy[]): ListrTask[] {
    const config = project.getConfig(ctx.stage);

    const returnTasks: ListrTask[] = [];

    returnTasks.push({
      title:
        'Deploying Google Action ' +
        Utils.printStage(ctx.stage) +
        (ctx.projectId ? ' ' + ctx.projectId : ''),
      task: (ctx: JovoTaskContextGoogle) => {
        const deployTasks: ListrTask[] = [
          {
            title: 'Creating file /googleAction/dialogflow_agent.zip',
            task: (ctx: JovoTaskContextGoogle, task: ListrTaskWrapper) => {
              return DialogFlowUtil.zip().then(() => {
                let info = 'Info: ';

                info += `Language model: `;
                for (const locale of project.getLocales()) {
                  info += `${locale} `;
                }
                info += '\n';
                info += `Fulfillment Endpoint: ${DialogFlowUtil.getAgentJson().webhook.url}`; // eslint-disable-line
                task.skip(info);
              });
            },
          },
          {
            title: `Uploading and restoring agent for project ${highlight(ctx.projectId)}`, // eslint-disable-line
            enabled: (ctx: JovoTaskContextGoogle) => !!ctx.projectId,
            task: (ctx: JovoTaskContextGoogle, task: ListrTaskWrapper) => {
              ctx.pathToZip = GoogleActionUtil.getPath() + '/dialogflow_agent.zip';

              const keyFile = project.jovoConfigReader!.getConfigParameter(
                'googleAction.dialogflow.keyFile',
                ctx.stage,
              );
              let p = Promise.resolve();
              if (keyFile) {
                if (!fs.existsSync(process.cwd() + pathSep + keyFile)) {
                  throw new JovoCliError(
                    `Keyfile ${process.cwd() + pathSep + keyFile} does not exist.`,
                    'jovo-cli-platform-google',
                  );
                }
                ctx.keyFile = process.cwd() + pathSep + keyFile;
                p = p.then(() => DialogFlowUtil.v2.activateServiceAccount(ctx));
              }

              p = p
                .then(() => DialogFlowUtil.v2.checkGcloud())
                .then(() => DialogFlowUtil.v2.restoreAgent(ctx));
              return p;
            },
          },
          {
            title: 'Training started',
            enabled: (ctx: JovoTaskContextGoogle) => !!ctx.projectId,
            task: (ctx: JovoTaskContextGoogle, task: ListrTaskWrapper) => {
              return DialogFlowUtil.v2.trainAgent(ctx);
            },
          },
        ];

        // Add the deploy target tasks
        targets.forEach((target) => {
          deployTasks.push.apply(deployTasks, target.execute(ctx, project));
        });

        return new listr(deployTasks);
      },
    });

    return returnTasks;
  }

  /**
   * Transforms Dialogflow data into a Jovo model
   * @param {string} locale
   * @return {{}}
   */
  async reverse(locale: string): Promise<JovoModelData> {
    try {
      const platformFiles: NativeFileInformation[] = await DialogFlowUtil.getPlatformFiles();

      const jovoModel = new JovoModelDialogflow();
      jovoModel.importNative(platformFiles, locale);
      const nativeData = jovoModel.exportJovoModel();
      if (nativeData === undefined) {
        throw new JovoCliError(
          'Dialogflow files did not contain any valid data.',
          'jovo-cli-platform-google',
        );
      }
      // @ts-ignore
      return nativeData;
    } catch (err) {
      if (err instanceof JovoCliError) {
        throw err;
      }

      throw new JovoCliError(err.message, 'jovo-cli-platform-google');
    }
  }

  async transform(locale: string, stage: string | undefined) {
    try {
      let model;
      model = project.getModel(locale);

      // Make sure all dialog flow folders exist
      if (!fs.existsSync(DialogFlowUtil.getPath())) {
        fs.mkdirSync(DialogFlowUtil.getPath());
      }
      if (!fs.existsSync(DialogFlowUtil.getIntentsFolderPath())) {
        fs.mkdirSync(DialogFlowUtil.getIntentsFolderPath());
      }
      if (!fs.existsSync(DialogFlowUtil.getEntitiesFolderPath())) {
        fs.mkdirSync(DialogFlowUtil.getEntitiesFolderPath());
      }

      let outputLocale = locale.toLowerCase();

      if (['pt-br', 'zh-cn', 'zh-hk', 'zh-tw'].indexOf(outputLocale) === -1) {
        const primLanguage = project.getLocales().filter((lang: string) => {
          return locale.substr(0, 2) === lang.substr(0, 2);
        });
        if (primLanguage.length === 1) {
          outputLocale = locale.substr(0, 2);
        }
      }

      const concatArrays = function customizer(
        objValue: any[], // tslint:disable-line:no-any
        srcValue: any, // tslint:disable-line:no-any
      ) {
        // tslint:disable-line
        if (_.isArray(objValue)) {
          return objValue.concat(srcValue);
        }
      };

      if (project.jovoConfigReader!.getConfigParameter(`languageModel.${locale}`, stage)) {
        model = _.mergeWith(
          model,
          project.jovoConfigReader!.getConfigParameter(`languageModel.${locale}`, stage),
          concatArrays,
        );
      }
      if (
        project.jovoConfigReader!.getConfigParameter(
          `googleAction.dialogflow.languageModel.${locale}`,
          stage,
        )
      ) {
        model = _.mergeWith(
          model,
          project.jovoConfigReader!.getConfigParameter(
            `googleAction.dialogflow.languageModel.${locale}`,
            stage,
          ),
          concatArrays,
        );
      }

      const jovoModel = new JovoModelDialogflow(model, outputLocale);
      const dialogflowModelFiles = jovoModel.exportNative();

      if (dialogflowModelFiles === undefined || dialogflowModelFiles.length === 0) {
        // Should actually never happen but who knows
        throw new JovoCliError(
          `Could not build Dialogflow files for locale "${locale}"!`,
          'jovo-cli-platform-google',
        );
      }
      for (const fileInformation of dialogflowModelFiles) {
        await writeFile(
          pathJoin(DialogFlowUtil.getPath(), ...fileInformation.path),
          JSON.stringify(fileInformation.content, null, '\t'),
        );
      }

      return Promise.resolve();
    } catch (err) {
      if (err instanceof JovoCliError) {
        throw err;
      }

      throw new JovoCliError(err.message, 'jovo-cli-platform-google');
    }
  }
}
