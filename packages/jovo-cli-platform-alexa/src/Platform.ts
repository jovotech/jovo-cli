import { flags } from '@oclif/command';
import * as fs from 'fs';
import * as inquirer from 'inquirer';
import * as listr from 'listr';
import { ListrTask, ListrTaskWrapper } from 'listr';
import * as _ from 'lodash';
import * as path from 'path';
import * as ask from './Ask';
import * as smapi from './smapi';

import {
  DEFAULT_LOCALE,
  getProject,
  InputFlags,
  JovoCliDeploy,
  JovoCliPlatform,
  OutputFlags,
  Project,
  TARGET_ALL,
  TARGET_INFO,
  TARGET_MODEL,
  Utils,
  JovoCliError,
} from 'jovo-cli-core';
import { Intent, JovoModelData } from 'jovo-model';
import { AlexaLMIntent, JovoModelAlexa, JovoModelAlexaData } from 'jovo-model-alexa';
import { AppFileAlexa, JovoTaskContextAlexa } from '.';

const highlight = require('chalk').white.bold;
const subHeadline = require('chalk').white.dim;

const project: Project = getProject();

export class JovoCliPlatformAlexa extends JovoCliPlatform {
  static PLATFORM_KEY = 'alexaSkill';
  static ID_KEY = 'skillId';
  askVersion = ask.checkAsk();

  constructor() {
    super();
  }

  /**
   * Return platfrom specific config id
   *
   * @param {Project} project The project
   * @param {ArgOptions} [argOptions] CLI arguments
   * @returns {object}
   * @memberof JovoCliPlatform
   */
  getPlatformConfigIds(project: Project, options: OutputFlags): object {
    try {
      let skillId;
      if (options && options.hasOwnProperty('skill-id') && options['skill-id']) {
        skillId = options['skill-id'];
      } else {
        skillId =
          project.jovoConfigReader!.getConfigParameter(
            'alexaSkill.skillId',
            options && (options.stage as string),
          ) || this.getSkillId();
      }

      const returnValue = {};
      if (skillId) {
        // @ts-ignore
        returnValue.skillId = skillId;
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
   * @param {ArgOptions} [argOptions] CLI arguments
   * @returns {object}
   * @memberof JovoCliPlatform
   */
  getPlatformConfigValues(project: Project, options: OutputFlags): object {
    let askProfile;
    if (options && options.hasOwnProperty('ask-profile') && options['ask-profile']) {
      askProfile = options['ask-profile'];
    }

    return {
      askProfile:
        askProfile ||
        project.jovoConfigReader!.getConfigParameter(
          'alexaSkill.ask-profile',
          options && (options.stage as string),
        ) ||
        project.jovoConfigReader!.getConfigParameter(
          'alexaSkill.askProfile',
          options && (options.stage as string),
        ) ||
        project.jovoConfigReader!.getConfigParameter(
          'host.lambda.ask-Profile',
          options && (options.stage as string),
        ) ||
        project.jovoConfigReader!.getConfigParameter(
          'host.lambda.askProfile',
          options && (options.stage as string),
        ) ||
        process.env.ASK_DEFAULT_PROFILE ||
        ask.DEFAULT_ASK_PROFILE,
    };
  }

  /**
   * Returns existing projects of user
   *
   * @param {JovoTaskContextAlexa} ctx Configuration file
   * @returns {Promise<object>}
   * @memberof JovoCliPlatform
   */
  getExistingProjects(ctx: JovoTaskContextAlexa): Promise<inquirer.ChoiceType[]> {
    // Check if ask-cli is installed.
    ask.checkAsk();

    if (this.askVersion === '2') {
      // Get Access Token for SMAPI
      return smapi.listSkills(ctx);
    } else {
      return ask.askApiListSkills(ctx);
    }
  }

  getAdditionalCliOptions(command: string, options: InputFlags): void {
    if (command === 'get') {
      options['skill-id'] = flags.string({
        char: 's',
        description: 'Alexa Skill ID',
      });
    }

    if (['build', 'deploy', 'get', 'init', 'new'].includes(command)) {
      options['ask-profile'] = flags.string({
        description: 'Name of used ASK profile',
      });
    }
  }

  validateAdditionalCliOptions(command: string, options: OutputFlags): boolean {
    if (['build', 'deploy', 'get', 'init', 'new'].includes(command)) {
      return this.isValidAskProfile(options['ask-profile'] as string);
    }

    return true;
  }

  /**
   * Returns true if project has alexa skill files
   *
   * @returns {boolean}
   * @memberof JovoCliPlatformAlexa
   */
  hasPlatform(): boolean {
    try {
      const filePath = this.getSkillJsonPath();
      require(filePath);
      return true;
    } catch (err) {
      return false;
    }
  }

  /**
   * Set platform defaults on model
   *
   * @param {JovoModelAlexaData} model The model to set the data on
   * @returns {JovoModel}
   * @memberof JovoCliPlatform
   */
  setPlatformDefaults(model: JovoModelAlexaData): JovoModelData {
    if (_.get(model, 'alexa.interactionModel.languageModel.intents')) {
      const result = _.unionBy(
        _.get(model, 'alexa.interactionModel.languageModel.intents'),
        this.getDefaultIntents(),
        'name',
      );
      _.set(model, 'alexa.interactionModel.languageModel.intents', result);
    } else {
      _.set(model, 'alexa.interactionModel.languageModel.intents', this.getDefaultIntents());
    }

    // let jovoIntent: AlexaLMTypeValue;
    let jovoIntent: Intent;
    if (model.intents) {
      for (jovoIntent of model.intents) {
        if (_.get(jovoIntent, 'alexa.name')) {
          _.remove(
            _.get(model, 'alexa.interactionModel.languageModel.intents'),
            (currentObject: AlexaLMIntent) => {
              // @ts-ignore
              return currentObject.name === jovoIntent.alexa.name;
            },
          );
        }
      }
    }

    if (_.get(model, 'alexa.interactionModel.languageModel.intents').length === 0) {
      // @ts-ignore
      delete model.alexa.interactionModel.languageModel.intents;

      if (_.keys(_.get(model, 'alexa.interactionModel.languageModel')).length === 0) {
        // @ts-ignore
        delete model.alexa.interactionModel.languageModel;
      }
      if (_.keys(_.get(model, 'alexa.interactionModel')).length === 0) {
        // @ts-ignore
        delete model.alexa.interactionModel;
      }
      if (_.keys(_.get(model, 'alexa')).length === 0) {
        delete model.alexa;
      }
    }

    return model;
  }

  /**
   * Add Alexa to configuration file
   *
   * @param {AppFileAlexa} config
   * @returns {AppFile}
   * @memberof JovoCliPlatformAlexa
   */
  addPlatfromToConfig(config: AppFileAlexa): AppFileAlexa {
    if (!config.alexaSkill) {
      _.extend(config, {
        alexaSkill: {
          nlu: {
            name: 'alexa',
          },
        },
      });
    }

    return config;
  }

  /**
   * Returns the validator to check if the platform specific properties are valid
   *
   * @returns {tv4.JsonSchema}
   * @memberof JovoCliPlatformAlexa
   */
  getModelValidator(): tv4.JsonSchema {
    return JovoModelAlexa.getValidator();
  }

  /**
   * Checks validity of ask profile
   * @param {string} askProfile
   * @return {boolean}
   */
  isValidAskProfile(askProfile: string): boolean {
    if (askProfile) {
      if (askProfile.length === 0) {
        console.log('--ask-profile cannot be empty');
        return false;
      }
    }
    return true;
  }

  /**
   * Default Alexa Intents
   *
   * @returns {Array<object>}
   * @memberof Platform
   */
  getDefaultIntents(): Intent[] {
    return [
      {
        name: 'AMAZON.CancelIntent',
        samples: [],
      },
      {
        name: 'AMAZON.HelpIntent',
        samples: [],
      },
      {
        name: 'AMAZON.StopIntent',
        samples: [],
      },
    ];
  }

  /**
   * Gets tasks to build platform specific language model
   *
   * @param {JovoTaskContextAlexa} ctx The Context
   * @returns {ListrTask[]}
   * @memberof JovoCliPlatform
   */
  getBuildTasks(ctx: JovoTaskContextAlexa): ListrTask[] {
    const hasAlexaSkill = this.hasPlatform();

    let title = 'Creating Alexa Skill project files ' + Utils.printStage(ctx.stage);
    if (hasAlexaSkill) {
      title = 'Updating Alexa Skill project files ' + Utils.printStage(ctx.stage);
    }
    title += '\n' + subHeadline('   Path: ./platforms/alexaSkill');

    const buildPlatformTasks: ListrTask[] = [];

    buildPlatformTasks.push({
      title,
      task: async () => {
        let titleInteractionModel = 'Creating Alexa Interaction Model';
        if (hasAlexaSkill) {
          titleInteractionModel = 'Updating Alexa Interaction Model';
        }
        if (this.askVersion === '2') {
          titleInteractionModel +=
            '\n' + subHeadline('   Path: ./platforms/alexaSkill/interactionModels/custom');
        } else if (this.askVersion === '1') {
          titleInteractionModel += '\n' + subHeadline('   Path: ./platforms/alexaSkill/models');
        } else {
          throw new JovoCliError('Unsupported ASK CLI version.', 'jovo-cli-platform-alexa');
        }

        return new listr([
          {
            title: 'Creating Alexa project files',
            enabled: () => !hasAlexaSkill,
            task: () => {
              return new listr([
                {
                  title: 'skill.json',
                  task: async (ctx) => {
                    this.createAlexaSkill(ctx);

                    if (ctx.invocation) {
                      try {
                        await project.updateInvocation(ctx.invocation, ctx.locales[0]);
                      } catch (err) {
                        // ToDo: ??
                      }
                    }

                    this.buildSkillAlexa(ctx.stage);
                    await Utils.wait(500);
                  },
                },
              ]);
            },
          },
          {
            title:
              'Updating Skill Manifest\n' +
              subHeadline('   Path: ./platforms/alexaSkill/skill.json'),
            enabled: () => hasAlexaSkill,
            task: async (ctx) => {
              this.buildSkillAlexa(ctx.stage);
              await Utils.wait(500);
            },
          },
          {
            title: titleInteractionModel,
            enabled: () => project.hasModelFiles(ctx.locales),
            task: (ctx) => {
              const buildLocalesTasks: ListrTask[] = [];

              for (const mainLocale of ctx.locales) {
                const buildLocales: string[] = [];
                let subLocales: string[] = [];

                if (mainLocale.length === 2) {
                  subLocales = this.getSubLocales(mainLocale);
                  if (subLocales && subLocales.length > 0) {
                    buildLocales.push(...subLocales);
                  }
                }

                if (buildLocales.length === 0) {
                  buildLocales.push(mainLocale);
                }

                for (const locale of buildLocales) {
                  buildLocalesTasks.push({
                    title: locale,
                    task: async () => {
                      this.buildLanguageModelAlexa(mainLocale, ctx.stage);
                      // ToDo: Check this!
                      // Refresh the model data else it uses the old previously cached one
                      this.getModel(locale, true);
                      await Utils.wait(500);
                    },
                  });
                }
              }

              return new listr(buildLocalesTasks);
            },
          },
        ]);
      },
    });

    return buildPlatformTasks;
  }

  /**
   * Get tasks to get existing platform project
   *
   * @param {JovoTaskContextAlexa} ctx The Context
   * @returns {ListrTask[]}
   * @memberof JovoCliPlatform
   */
  getGetTasks(ctx: JovoTaskContextAlexa): ListrTask[] {
    const alexaSkillPath = this.getPath();
    if (!fs.existsSync(alexaSkillPath)) {
      fs.mkdirSync(alexaSkillPath);
    }

    return [
      {
        title: 'Getting Alexa Skill project for ASK profile ' + highlight(ctx.askProfile),
        enabled: (ctx: JovoTaskContextAlexa) =>
          ctx.targets!.includes(TARGET_ALL) || ctx.targets!.includes(TARGET_INFO),
        task: async (ctx: JovoTaskContextAlexa, task) => {
          ctx.info = 'Info: ';

          ask.checkAsk();

          if (this.askVersion === '2') {
            if (!fs.existsSync(this.getSkillPackagePath())) {
              fs.mkdirSync(this.getSkillPackagePath(), { recursive: true });
            }

            // ToDo: Stage configurable?
            await smapi.getSkillInformation(ctx, this.getSkillJsonPath(), 'development');
            this.setAlexaSkillId(ctx.skillId!);
            // ToDo: Deploy Account Linking!
            const accountLinkingJson = await smapi.getAccountLinkingInformation(ctx, 'development');
            if (accountLinkingJson) {
              // ToDo: Test!
              fs.writeFileSync(
                this.getAccountLinkingPath(),
                JSON.stringify(accountLinkingJson, null, '\t'),
              );
              ctx.info += 'Account Linking Information saved to ' + this.getAccountLinkingPath();
            }
          } else {
            await ask.askApiGetSkill(ctx, this.getSkillJsonPath());
            this.setAlexaSkillId(ctx.skillId!);
            const accountLinkingJson = await ask.askApiGetAccountLinking(ctx);
            if (accountLinkingJson) {
              fs.writeFileSync(this.getAccountLinkingPath(), accountLinkingJson);
              ctx.info += 'Account Linking Information saved to ' + this.getAccountLinkingPath();
            }
          }

          let info = 'Info: ';
          const skillInfo = this.getSkillSimpleInformation();
          info += `Skill Name: ${skillInfo.name}
Skill ID: ${skillInfo.skillId}
Endpoint: ${skillInfo.endpoint}`;
          task.skip(info);
        },
      },
      {
        // ToDo: Different location for v2!
        title: 'Getting Alexa Skill model files and saving to /platforms/alexaSkill/models',
        enabled: (ctx: JovoTaskContextAlexa) =>
          ctx.targets!.includes(TARGET_ALL) || ctx.targets!.includes(TARGET_MODEL),
        task: (ctx: JovoTaskContextAlexa) => {
          const alexaModelPath = this.getModelsPath();
          if (!fs.existsSync(alexaModelPath)) {
            fs.mkdirSync(alexaModelPath, { recursive: true });
          }
          const skillJson = this.getSkillJson();

          let locales = Object.keys(skillJson.manifest.publishingInformation.locales);

          if (ctx.locales && ctx.targets!.includes(TARGET_MODEL)) {
            locales = ctx.locales;
          }

          const getLocaleSubtasks: ListrTask[] = [];
          for (const locale of locales) {
            getLocaleSubtasks.push({
              title: locale,
              task: async (ctx: JovoTaskContextAlexa) => {
                if (this.askVersion === '2') {
                  return await smapi.getInteractionModel(
                    ctx,
                    locale,
                    this.getModelPath(locale),
                    'development',
                  );
                } else {
                  return ask.askApiGetModel(ctx, this.getModelPath(locale), locale);
                }
              },
            });
          }
          return new listr(getLocaleSubtasks);
        },
      },
    ];
  }

  /**
   * Get tasks to build Jovo language model from platform
   * specific language model
   *
   * @param {JovoTaskContextAlexa} ctx The Context
   * @returns {ListrTask[]}
   * @memberof JovoCliPlatform
   */
  getBuildReverseTasks(ctx: JovoTaskContextAlexa): ListrTask[] {
    const returnTasks: ListrTask[] = [];

    returnTasks.push({
      title: 'Reversing model files',
      task: (ctx: JovoTaskContextAlexa) => {
        const reverseLocales: ListrTask[] = [];
        const locales = this.getLocales(ctx.locales);
        for (const locale of locales) {
          reverseLocales.push({
            title: locale.toString(),
            task: async () => {
              const alexaModelFiles = [
                {
                  path: ['${locale}.json'],
                  content: this.getModel(locale),
                },
              ];

              const jovoModel = new JovoModelAlexa();
              jovoModel.importNative(alexaModelFiles, locale.toString());

              // Apply the changes to the current model-file if one exists
              let modelFile;
              try {
                modelFile = await project.getModel(locale);
              } catch (e) {
                // Currently no model file exists so there is
                // nothing to merge it with

                modelFile = {
                  invocation: '',
                };
              }

              const nativeData = jovoModel.exportJovoModel();
              if (nativeData === undefined) {
                throw new JovoCliError(
                  'Alexa files did not contain any valid data.',
                  'jovo-cli-platform-alexa',
                );
              }

              _.merge(modelFile, nativeData);

              return project.saveModel(modelFile, locale);
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
   * @param {JovoTaskContextAlexa} ctx The Context
   * @param {JovoCliDeploy[]} targets The additional deploy targets
   * @returns {ListrTask[]}
   * @memberof JovoCliPlatform
   */
  getDeployTasks(ctx: JovoTaskContextAlexa, targets: JovoCliDeploy[]): ListrTask[] {
    const returnTasks: ListrTask[] = [];
    ctx.targets = ctx.targets || [];

    // @ts-ignore
    const additionalTargetKeys: string[] = targets.map((target) => target.constructor.TARGET_KEY);

    try {
      ctx.skillId = this.getSkillId();
    } catch (err) {
      if (
        ctx.targets.length === 0 ||
        (ctx.targets.length &&
          !additionalTargetKeys.some((targetName) => ctx.targets!.includes(targetName)))
      ) {
        // prettier-ignore
        console.log(`Couldn't find a platform folder. Please use the "jovo build" command to create platform-specific files.\n`);
        return [];
      }
    }

    returnTasks.push({
      title: `Deploying Alexa Skill ${Utils.printStage(ctx.stage)}`,
      task: (ctx: JovoTaskContextAlexa, task: ListrTaskWrapper) => {
        const deployTasks: ListrTask[] = [
          {
            title: `Creating Alexa Skill project for ASK profile ${highlight(ctx.askProfile)}`, // eslint-disable-line
            enabled: (ctx: JovoTaskContextAlexa) => {
              return (
                !ctx.skillId &&
                (!ctx.targets ||
                  targets.length === 0 ||
                  (!!ctx.targets.length &&
                    !additionalTargetKeys.some((targetName) => ctx.targets!.includes(targetName))))
              );
            },
            task: async (ctx: JovoTaskContextAlexa) => {
              ctx.targets = [TARGET_ALL];

              if (this.askVersion === '2') {
                const skillId = await smapi.createSkill(ctx, this.getSkillJsonPath());
                ctx.skillId = skillId;
                ctx.newSkill = true;
                this.setAlexaSkillId(skillId);
                await smapi.updateAccountLinkingInformation(
                  ctx,
                  this.getAccountLinkingPath(),
                  'development',
                );
                await smapi.getSkillStatus(ctx);
              } else {
                const skillId = await ask.askApiCreateSkill(ctx, this.getSkillJsonPath());
                ctx.skillId = skillId;
                ctx.newSkill = true;
                this.setAlexaSkillId(skillId);
                await ask.getSkillStatus(ctx);
              }

              const skillInfo = this.getSkillInformation();
              let info = 'Info: ';
              info += `Skill Name: ${skillInfo.name}
Skill ID: ${skillInfo.skillId}
Invocation Name: ${skillInfo.invocationName}
Endpoint: ${skillInfo.endpoint}`;
              task.skip(info);
            },
          },
          {
            title: 'Updating Alexa Skill project for ASK profile ' + ctx.askProfile,
            enabled: (ctx: JovoTaskContextAlexa) =>
              !!ctx.skillId &&
              !ctx.newSkill &&
              (ctx.targets!.includes(TARGET_ALL) || ctx.targets!.includes(TARGET_INFO)),
            task: async (ctx: JovoTaskContextAlexa, task: ListrTaskWrapper) => {
              if (this.askVersion === '2') {
                await smapi.updateSkill(ctx, this.getSkillJsonPath());
                await smapi.updateAccountLinkingInformation(
                  ctx,
                  this.getAccountLinkingPath(),
                  'development',
                );
                await smapi.getSkillStatus(ctx);
              } else {
                await ask.askApiUpdateSkill(ctx, this.getSkillJsonPath());
                await ask.getSkillStatus(ctx);
              }

              const skillInfo = this.getSkillInformation();
              let info = 'Info: ';
              info += `Skill Name: ${skillInfo.name}
Skill ID: ${skillInfo.skillId}
Invocation Name: ${skillInfo.invocationName}
Endpoint: ${skillInfo.endpoint}`;
              task.skip(info);
            },
          },
          {
            title: 'Deploying Interaction Model, waiting for build',
            enabled: (ctx: JovoTaskContextAlexa) =>
              ctx.targets!.includes(TARGET_ALL) || ctx.targets!.includes(TARGET_MODEL),
            task: (ctx: JovoTaskContextAlexa) => {
              const deployLocaleTasks: ListrTask[] = [];

              for (const mainLocale of this.getLocales(ctx.locales)) {
                const deployLocales: string[] = [];
                let sublocales: string[] = [];

                if (mainLocale.length === 2) {
                  sublocales = this.getSubLocales(mainLocale);
                  if (sublocales) {
                    deployLocales.push(...sublocales);
                  }
                }

                if (deployLocales.length === 0) {
                  deployLocales.push(mainLocale);
                }

                for (const locale of deployLocales) {
                  deployLocaleTasks.push({
                    title: locale,
                    task: async (ctx: JovoTaskContextAlexa) => {
                      const config = _.cloneDeep(ctx);
                      config.locales = [locale];

                      if (this.askVersion === '2') {
                        await smapi.updateInteractionModel(
                          ctx,
                          locale,
                          this.getModelPath(locale),
                          'development',
                        );
                        await smapi.getSkillStatus(ctx);
                      } else {
                        await ask.askApiUpdateModel(config, this.getModelPath(locale), locale);
                        await ask.getModelStatus(config);
                      }
                    },
                  });
                }
              }
              return new listr(deployLocaleTasks);
            },
          },
        ];

        // Add the deploy target tasks
        targets.forEach((target) => {
          deployTasks.push.apply(deployTasks, target.execute(ctx, project));
        });

        deployTasks.push({
          title: 'Enabling skill for testing',
          task: async (ctx: JovoTaskContextAlexa) => {
            if (!ctx.newSkill) {
              task.skip('');
            }
            if (this.askVersion === '2') {
              return await smapi.enableSkill(ctx, 'development');
            } else {
              return ask.askApiEnableSkill(ctx);
            }
          },
        });

        return new listr(deployTasks);
      },
    });

    return returnTasks;
  }

  /**
   * Returns path to Alexa model files
   * @return {string}
   */
  getModelsPath(): string {
    if (this.askVersion === '2') {
      return path.join(this.getSkillPackagePath(), 'interactionModels/custom');
    } else {
      return path.join(this.getPath(), 'models');
    }
  }

  /**
   * Returns path to Alexa Model file
   * @param {string} locale
   * @return {string}
   */
  getModelPath(locale: string): string {
    return path.join(this.getModelsPath(), locale + '.json');
  }

  /**
   * Returns path to Alexa skill package folder.
   */
  getSkillPackagePath(): string {
    return path.join(this.getPath(), 'skill-package');
  }

  /**
   * Returns project locales
   *
   * @param {(string | string[])} [locale]
   * @returns {string[]}
   * @memberof JovoCliPlatformAlexa
   */
  getLocales(locale?: string | string[]): string[] {
    try {
      if (locale) {
        if (Array.isArray(locale)) {
          return locale;
        } else {
          return [locale];
        }
      }
      const files = fs.readdirSync(this.getModelsPath());

      if (files.length === 0) {
        return [DEFAULT_LOCALE];
      }
      const locales: string[] = [];
      for (const file of files) {
        if (file.length === 10) {
          locales.push(file.substr(0, 5));
        }
      }
      return locales;
    } catch (err) {
      throw err;
    }
  }

  /**
   * Returns path to AlexaSkill account linking json
   * @return {string}
   */
  getAccountLinkingPath(): string {
    return path.join(this.getPath(), 'accountLinking.json');
  }

  /**
   * Returns project skill id extracted from
   * Alexa Skill config
   * @return {string}
   */
  getSkillId() {
    try {
      const askConfig = this.getAskConfig();
      // ToDo: profile as argument, so deploy_settings.${profile}.skill_id
      // prettier-ignore
      const skillId = _.get(askConfig, this.askVersion === '2' ? 'profiles.default.skillId' : 'deploy_settings.default.skill_id')
      if (skillId && skillId.length > 0) {
        return skillId;
      }
    } catch (err) {
      throw err;
    }
  }
  /**
   * Returns path to skill.json
   */
  getSkillJsonPath(): string {
    return path.join(
      this.askVersion === '2' ? this.getSkillPackagePath() : this.getPath(),
      'skill.json',
    );
  }

  /**
   * Returns path to .ask/
   * @return {string}
   */
  getAskConfigFolderPath(): string {
    return path.join(this.getPath(), '.ask');
  }

  /**
   * Returns path to .ask/ask-states.json file
   */
  getAskConfigPath(): string {
    return path.join(
      this.getAskConfigFolderPath(),
      this.askVersion === '2' ? 'ask-states.json' : 'config',
    );
  }

  /**
   * Returns path to platforms/alexaSkill/ask-resources.json.
   */
  getAskResourcesPath(): string {
    return path.join(this.getPath(), 'ask-resources.json');
  }

  /**
   * Returns skill.json object
   * @return {*}
   */
  getSkillJson() {
    try {
      return require(this.getSkillJsonPath());
    } catch (error) {
      throw error;
    }
  }

  /**
   * Returns .ask/config object
   * @return {any}
   */
  getAskConfig() {
    try {
      return JSON.parse(fs.readFileSync(this.getAskConfigPath(), 'utf8'));
    } catch (error) {
      throw error;
    }
  }

  /**
   * Returns Alexa model object
   *
   * @param {string} locale The locale to load
   * @param {boolean} [refresh] If the file cache should be refreshed
   * @returns
   * @memberof JovoCliPlatformAlexa
   */
  getModel(locale: string, refresh?: boolean) {
    try {
      const path = this.getModelPath(locale);
      if (refresh === true) {
        // Delete the cache so that it gets read new from disk
        delete require.cache[path];
      }
      return require(path);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Returns the defined sub locales for the given locale
   *
   * @param {string} locale The locale to return sub locals for
   * @returns {string[]}
   * @memberof JovoCliPlatformAlexa
   */
  getSubLocales(locale: string): string[] {
    const appJson = project.getConfig();

    const sublocales = _.get(appJson, `alexaSkill.nlu.lang.${locale}`);

    if (!sublocales) {
      return [];
    }

    return sublocales;
  }

  /**
   * Creates empty ask-resources.json file.
   */
  createEmptyAskResources(ctx: JovoTaskContextAlexa) {
    const askResources = {
      askcliResourcesVersion: '2020-03-31',
      profiles: {
        default: {
          skillMetadata: {
            src: './skill-package',
          },
        },
      },
    };

    return askResources;
  }

  /**
   * Creates empty ask config
   * @param version
   */
  createEmptyAskConfig() {
    let askConfig;
    if (this.askVersion === '2') {
      askConfig = {
        askcliStatesVersion: '2020-03-31',
        profiles: {
          default: {
            skillId: '',
            skillMetadata: {
              lastDeployHash: '',
            },
            code: {},
          },
        },
      };
    } else {
      askConfig = {
        deploy_settings: {
          default: {
            skill_id: '',
            was_cloned: false,
          },
        },
      };
    }

    return askConfig;
  }

  /**
   * Creates empty skill.json
   * @param {string} skillName
   * @param {Array<string>} locales
   * @return {*}
   */
  createEmptySkillJson(skillName: string, locales: string[] | undefined) {
    const skillJson = {
      manifest: {
        publishingInformation: {
          locales: {},
          isAvailableWorldwide: true,
          testingInstructions: 'Sample Testing Instructions.',
          category: 'EDUCATION_AND_REFERENCE',
          distributionCountries: [],
        },
        apis: {
          custom: {},
        },
        manifestVersion: '1.0',
        privacyAndCompliance: {
          allowsPurchases: false,
          locales: {},
          isExportCompliant: true,
          containsAds: false,
          isChildDirected: false,
          usesPersonalInfo: false,
        },
      },
    };

    if (locales) {
      for (const locale of locales) {
        if (locale.length === 2) {
          try {
            const sublocales = this.getSubLocales(locale);

            if (!sublocales) {
              throw new JovoCliError(
                `Could not find sublocales for locale "${locale}".`,
                'jovo-cli-platform-alexa',
              );
            }

            for (const sublocale of sublocales) {
              _.set(skillJson, `manifest.publishingInformation.locales.${sublocale}`, {
                summary: 'Sample Short Description',
                examplePhrases: ['Alexa open hello world'],
                keywords: ['hello', 'world'],
                name: skillName,
                description: 'Sample Full Description',
                smallIconUri: 'https://via.placeholder.com/108/09f/09f.png',
                largeIconUri: 'https://via.placeholder.com/512/09f/09f.png',
              });

              _.set(skillJson, `manifest.privacyAndCompliance.locales.${sublocale}`, {
                privacyPolicyUrl: 'http://example.com/policy',
                termsOfUseUrl: '',
              });
            }
          } catch (error) {
            throw new JovoCliError(
              `Could not retrieve locales mapping for language "${locale}".`,
              'jovo-cli-platform-alexa',
            );
          }
        } else {
          _.set(skillJson, `manifest.publishingInformation.locales.${locale}`, {
            summary: 'Sample Short Description',
            examplePhrases: ['Alexa open hello world'],
            keywords: ['hello', 'world'],
            name: skillName,
            description: 'Sample Full Description',
            smallIconUri: 'https://via.placeholder.com/108/09f/09f.png',
            largeIconUri: 'https://via.placeholder.com/512/09f/09f.png',
          });

          _.set(skillJson, `manifest.privacyAndCompliance.locales.${locale}`, {
            privacyPolicyUrl: 'http://example.com/policy',
            termsOfUseUrl: '',
          });
        }
      }
    }

    return skillJson;
  }

  /**
   * Creates empty skill project files
   * @param {*} config
   * @return {Promise<any>}
   */
  createAlexaSkill(ctx: JovoTaskContextAlexa) {
    try {
      let alexaModelPath: string = this.getModelsPath();
      if (!fs.existsSync(alexaModelPath)) {
        fs.mkdirSync(alexaModelPath, { recursive: true });
      }

      const askConfigFolderPath = this.getAskConfigFolderPath();
      if (!fs.existsSync(askConfigFolderPath)) {
        fs.mkdirSync(askConfigFolderPath);
      }

      const skillJson = this.createEmptySkillJson(project.getProjectName() as string, ctx.locales);
      const skillJsonPath = this.getSkillJsonPath();
      fs.writeFileSync(skillJsonPath, JSON.stringify(skillJson, null, '\t'));

      const askConfig = this.createEmptyAskConfig();
      fs.writeFileSync(this.getAskConfigPath(), JSON.stringify(askConfig, null, '\t'));

      if (this.askVersion === '2') {
        const askResources = this.createEmptyAskResources(ctx);
        fs.writeFileSync(this.getAskResourcesPath(), JSON.stringify(askResources, null, '\t'));
      }
    } catch (err) {
      console.log(err);
    }
  }

  /**
   * Builds and saves Alexa Skill model from jovo model
   * @param {string} locale
   * @param {string} stage
   * @return {Promise<any>}
   */
  buildLanguageModelAlexa(locale: string, stage: string) {
    try {
      let model = project.getModel(locale);

      if (project.jovoConfigReader!.getConfigParameter(`languageModel.${locale}`, stage)) {
        model = _.mergeWith(
          model,
          project.jovoConfigReader!.getConfigParameter(`languageModel.${locale}`, stage),
          (objValue: any[], srcValue: any) => {
            // Since _.merge simply overwrites the original array, concatenate them instead.
            if (_.isArray(objValue)) {
              return objValue.concat(srcValue);
            }
          },
        );
      }

      // prettier-ignore
      if (project.jovoConfigReader!.getConfigParameter(`alexaSkill.languageModel.${locale}`, stage)) {
        model = _.mergeWith(
          model,
          project.jovoConfigReader!.getConfigParameter(`alexaSkill.languageModel.${locale}`, stage),
          (objValue: any[], srcValue: any) => {
            if (_.isArray(objValue)) {
              return objValue.concat(srcValue);
            }
          },
        );
      }

      const jovoModel = new JovoModelAlexa(model, locale);
      const alexaModelFiles = jovoModel.exportNative();

      if (!alexaModelFiles || alexaModelFiles.length === 0) {
        // Should actually never happen but who knows
        throw new JovoCliError(
          `Could not build Alexa files for locale "${locale}"!`,
          'jovo-cli-platform-alexa',
        );
      }

      let locales: string[] = [];
      if (locale.length === 2) {
        try {
          if (
            !project.jovoConfigReader!.getConfigParameter(`alexaSkill.nlu.lang.${locale}`, stage)
          ) {
            throw new JovoCliError(
              `Could not find configuration parameter for locale "${locale}"!`,
              'jovo-cli-platform-alexa',
            );
          }

          locales = project.jovoConfigReader!.getConfigParameter(
            `alexaSkill.nlu.lang.${locale}`,
            stage,
          ) as string[];
        } catch (err) {
          throw new JovoCliError(
            `Could not retrieve locales mapping for language "${locale}"!`,
            'jovo-cli-platform-alexa',
          );
        }
      } else {
        locales = [locale];
      }

      for (const targetLocale of locales) {
        fs.writeFileSync(
          this.getModelPath(targetLocale),
          JSON.stringify(alexaModelFiles[0].content, null, '\t'),
        );
      }
    } catch (err) {
      console.log(err);
      return;
    }
  }

  /**
   * Builds and saves Alexa Skill model from jovo model
   * @param {string} stage
   * @return {Promise<any>}
   */
  buildSkillAlexa(stage: string) {
    const config = project.getConfig(stage) as AppFileAlexa;
    const skillJson = this.getSkillJson();

    const endpoint = _.get(config, 'endpoint');
    if (endpoint) {
      // Create basic HTTPS endpoint from Wildcard SSL.
      if (_.isString(endpoint)) {
        _.set(skillJson, 'manifest.apis.custom.endpoint', {
          sslCertificateType: 'Wildcard',
          uri: project.getEndpointFromConfig(endpoint),
        });
      } else if (_.isObject(endpoint) && _.get(endpoint, 'alexaSkill')) {
        // Get full object.
        _.set(
          skillJson,
          'manifest.apis.custom.endpoint',
          project.getEndpointFromConfig(_.get(endpoint, 'alexaSkill')),
        );
      }
    } else {
      let arn =
        _.get(config, 'alexaSkill.endpoint') ||
        _.get(config, 'alexaSkill.host.lambda.arn') ||
        _.get(config, 'host.lambda.arn');

      if (arn) {
        arn = project.getEndpointFromConfig(arn);
        if (_.startsWith(arn, 'arn')) {
          _.set(skillJson, 'manifest.apis.custom.endpoint', {
            uri: arn,
          });
        } else {
          _.set(skillJson, 'manifest.apis.custom.endpoint', {
            sslCertificateType: 'Wildcard',
            uri: arn,
          });
        }
      }
    }

    if (_.get(config, 'alexaSkill.manifest')) {
      _.merge(skillJson.manifest, config.alexaSkill!.manifest);
    }

    fs.writeFileSync(this.getSkillJsonPath(), JSON.stringify(skillJson, null, '\t'));

    const skillId = project.jovoConfigReader!.getConfigParameter('alexaSkill.skillId', stage);
    if (skillId) {
      this.setAlexaSkillId(skillId as string);
    }
  }

  /**
   * Returns skill id promise
   * @return {Promise<any>}
   */
  getSkillIdPromise() {
    return new Promise((resolve) => {
      fs.readFile(this.getAskConfigPath(), 'utf-8', (err, data) => {
        if (err) {
          resolve();
          return;
        }
        resolve(_.get(JSON.parse(data), 'deploy_settings.default.skill_id'));
      });
    });
  }

  /**
   * Returns skill information
   * @return {*}
   */
  getSkillInformation() {
    const skillJson = this.getSkillJson();
    const info = {
      name: '',
      invocationName: '',
      skillId: this.getSkillId(),
      endpoint: skillJson.manifest.apis.custom.endpoint.uri,
    };

    const locales = skillJson.manifest.publishingInformation.locales;
    for (const locale of Object.keys(locales)) {
      info.name += locales[locale].name + ' (' + locale + ') ';
      info.invocationName += this.getInvocationName(locale) + ' (' + locale + ') ';
    }
    return info;
  }

  /**
   * Returns simple skill information
   * @return {*}
   */
  getSkillSimpleInformation() {
    const skillJson = this.getSkillJson();

    const info = {
      name: '',
      skillId: this.getSkillId(),
      endpoint: _.get(skillJson, 'manifest.apis.custom.endpoint.uri', ''),
    };

    const locales = skillJson.manifest.publishingInformation.locales;
    for (const locale of Object.keys(locales)) {
      info.name += locales[locale].name + ' (' + locale + ') ';
    }

    return info;
  }

  /**
   * Returns true if endpoint is a lambda function arn
   * @return {boolean}
   */
  isLambdaEndpoint() {
    const skillJson = this.getSkillJson();
    return _.startsWith(skillJson.manifest.apis.custom.endpoint.uri, 'arn');
  }

  /**
   * Returns invocationName for given locale
   * @param {string} locale
   * @return {{}|interactionModel.languageModel}
   */
  getInvocationName(locale: string) {
    return this.getModel(locale).interactionModel.languageModel.invocationName;
  }

  /**
   * Saves Skill ID to .ask/config
   * @param {string} skillId
   * @return {Promise<any>}
   */
  setAlexaSkillId(skillId: string) {
    const askConfigFolderPath = this.getAskConfigFolderPath();
    if (!fs.existsSync(askConfigFolderPath)) {
      fs.mkdirSync(askConfigFolderPath);
    }

    let askConfig;
    try {
      const data = fs.readFileSync(this.getAskConfigPath(), 'utf-8');
      askConfig = JSON.parse(data);
    } catch (err) {
      if (err.code === 'ENOENT') {
        askConfig = this.createEmptyAskConfig();
      } else {
        throw err;
      }
    }

    if (this.askVersion === '2') {
      _.set(askConfig, 'profiles.default.skillId', skillId);
    } else {
      _.set(askConfig, 'deploy_settings.default.skill_id', skillId);
    }

    fs.writeFileSync(this.getAskConfigPath(), JSON.stringify(askConfig, null, '\t'));
  }
}
