import { ListrTask } from 'listr';
import * as Listr from 'listr';
import { join as pathJoin } from 'path';
import { existsSync, mkdirSync, writeFileSync, readdirSync, readFileSync } from 'fs';
import * as _ from 'lodash';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as chalk from 'chalk';
import * as yaml from 'yaml';

import {
  JovoCliPlatform,
  Project,
  OutputFlags,
  getProject,
  InputFlags,
  JovoCliError,
  Utils,
  JOVO_WEBHOOK_URL,
} from 'jovo-cli-core';
import { JovoModelGoogle } from 'jovo-model-google';
import { GASettings, JovoTaskContextGoogleCA, GAProjectLanguages, getGActionsError } from './utils';
import { JovoModelData, NativeFileInformation } from 'jovo-model';

const execSync = promisify(exec);
const project: Project = getProject();

export class JovoCliPlatformGoogleCA extends JovoCliPlatform {
  static PLATFORM_KEY: string = 'googleAction';
  static ID_KEY: string = 'projectId';
  static PLATFORM_ID: string = 'jovo-cli-platform-google-ca';

  getBuildTasks(ctx: JovoTaskContextGoogleCA): ListrTask[] {
    // Create folder /platforms/googleAction/conversational/, if it doesn't exist.
    const platformPath: string = this.getPath();
    if (!existsSync(platformPath)) {
      mkdirSync(platformPath, { recursive: true });
    }

    // prettier-ignore
    const title = `${this.hasPlatform() ? 'Updating' : 'Creating'} Google Conversational Action project files`;
    const task: ListrTask = {
      title,
      task: () => {
        const buildTasks: ListrTask[] = [];

        // Build locale array!
        if (!ctx.locales) {
          throw new JovoCliError(
            'Could not find locales for your Jovo project.',
            JovoCliPlatformGoogleCA.PLATFORM_ID,
          );
        }

        const defaultLocale = this.getDefaultLocale(ctx.stage, ctx.locales);
        const projectLocales: GAProjectLanguages = {};

        for (const locale of ctx.locales) {
          const localePrefix = locale.substring(0, 2);
          const locales: string[] = this.getProjectLanguages(locale, ctx.stage) || [];
          locales.unshift(locale);
          locales.unshift(localePrefix);

          projectLocales[locale] = _.uniq(locales);
        }

        const buildSettingsTask: ListrTask = {
          title: 'Building project settings...',
          task: () => {
            _.merge(ctx, this.getPlatformConfigIds(project, {}));

            const localeTasks: ListrTask[] = [];
            for (const [modelLocale, resolvedLocales] of Object.entries(projectLocales)) {
              for (const locale of resolvedLocales) {
                localeTasks.push({
                  title: locale,
                  task: async () => {
                    const projectSettings: GASettings = this.getProjectSettings(
                      modelLocale,
                      ctx.stage,
                    );

                    if (locale === defaultLocale) {
                      const defaultSettings = {
                        defaultLocale,
                        projectId: ctx.projectId,
                        category: this.getCategory(ctx.stage),
                      };

                      _.merge(projectSettings, defaultSettings);
                    }

                    const path: string[] = [this.getPath(), 'settings'];
                    if (locale !== defaultLocale) {
                      path.push(locale);
                    }

                    const settingsPath = pathJoin(...path);
                    if (!existsSync(settingsPath)) {
                      mkdirSync(settingsPath, { recursive: true });
                    }

                    writeFileSync(
                      pathJoin(settingsPath, 'settings.yaml'),
                      yaml.stringify(projectSettings),
                    );
                    await Utils.wait(500);
                  },
                });
              }
            }

            return new Listr(localeTasks);
          },
        };

        const buildManifestTask: ListrTask = {
          title: 'Building manifest.yaml...',
          task: async () => {
            const manifest = {
              version: '1.0',
            };

            writeFileSync(this.getManifestPath(), yaml.stringify(manifest));
            await Utils.wait(500);
          },
        };

        const buildWebhookTask: ListrTask = {
          title: 'Generating webhook...',
          task: async () => {
            const webhookFile = {
              handlers: [
                {
                  name: 'Jovo',
                },
              ],
              httpsEndpoint: {
                baseUrl: `${JOVO_WEBHOOK_URL}/${project.getWebhookUuid()}`,
              },
            };

            const webhookPath = pathJoin(this.getPath(), 'webhooks');

            if (!existsSync(webhookPath)) {
              mkdirSync(webhookPath, { recursive: true });
            }

            writeFileSync(
              pathJoin(webhookPath, 'ActionsOnGoogleFulfillment.yaml'),
              yaml.stringify(webhookFile),
            );
          },
        };

        const buildLanguageModelsTask: ListrTask = {
          title: 'Building project language model files for Conversational Actions...',
          task: () => {
            const localesTasks: ListrTask[] = [];

            for (const [modelLocale, resolvedLocales] of Object.entries(projectLocales)) {
              for (const locale of resolvedLocales) {
                localesTasks.push({
                  title: locale,
                  task: async () => {
                    this.buildLanguageModel(modelLocale, locale, ctx.stage!, defaultLocale);
                    await Utils.wait(500);
                  },
                });
              }
            }

            return new Listr(localesTasks);
          },
        };

        const buildGlobalIntents: ListrTask = {
          title: 'Building global main intent...',
          task: async () => {
            const intentHandler = {
              handler: { webhookHandler: 'Jovo' },
            };

            const globalPath = pathJoin(pathJoin(this.getPath(), 'custom', 'global'));
            if (!existsSync(globalPath)) {
              mkdirSync(globalPath, { recursive: true });
            }

            writeFileSync(
              pathJoin(globalPath, 'actions.intent.MAIN.yaml'),
              yaml.stringify(intentHandler),
            );
            await Utils.wait(500);
          },
        };

        // Task for building actions/
        const buildActions: ListrTask = {
          title: 'Building actions',
          task: async () => {
            const localeTasks: ListrTask[] = [];

            for (const [, resolvedLocales] of Object.entries(projectLocales)) {
              for (const locale of resolvedLocales) {
                localeTasks.push({
                  title: locale,
                  task: async () => {
                    const action = {
                      custom: { 'actions.intent.MAIN': {} },
                    };

                    const path: string[] = [this.getPath(), 'actions'];
                    if (locale !== defaultLocale) {
                      path.push(locale);
                    }

                    const actionsPath = pathJoin(...path);
                    if (!existsSync(actionsPath)) {
                      mkdirSync(actionsPath, { recursive: true });
                    }

                    writeFileSync(pathJoin(actionsPath, 'actions.yaml'), yaml.stringify(action));
                    await Utils.wait(500);
                  },
                });
              }
            }

            return new Listr(localeTasks);
          },
        };

        buildTasks.push(
          buildManifestTask,
          buildSettingsTask,
          buildWebhookTask,
          buildLanguageModelsTask,
          buildGlobalIntents,
          buildActions,
        );

        return new Listr(buildTasks);
      },
    };

    return [task];
  }

  getDeployTasks(ctx: JovoTaskContextGoogleCA): ListrTask[] {
    const task: ListrTask = {
      title: `Deploying Conversational Action ${Utils.printStage(ctx.stage)}`,
      task: async () => {
        const platformPath: string = this.getPath();

        // Check if platforms path exists.
        if (!existsSync(platformPath)) {
          throw new JovoCliError(
            "Couldn't find a platform folder.",
            JovoCliPlatformGoogleCA.PLATFORM_ID,
            "Please use the 'jovo build' command to create platform-specific files.",
          );
        }

        // Check if gactions CLI is installed.
        try {
          await execSync('gactions version');
        } catch (err) {
          throw new JovoCliError(
            'Jovo requires gactions CLI',
            JovoCliPlatformGoogleCA.PLATFORM_ID,
            'Install the gactions CLI following this guide: ' +
              'https://developers.google.com/assistant/conversational/quickstart#install_the_gactions_command-line_tool',
          );
        }

        try {
          const { stdout, stderr } = await execSync('gactions push', { cwd: platformPath });

          if (stderr) {
            console.log(Utils.printWarning(stderr));
            console.log(stdout);
            console.log('\n');
          }
        } catch (err) {
          if (err instanceof JovoCliError) {
            throw err;
          }

          throw getGActionsError(err.message);
        }
      },
    };

    return [task];
  }

  getGetTasks(ctx: JovoTaskContextGoogleCA) {
    // Create folder /platforms/googleAction/conversational/, if it doesn't exist.
    const platformPath: string = this.getPath();
    if (!existsSync(platformPath)) {
      mkdirSync(platformPath, { recursive: true });
    }

    const task: ListrTask = {
      // prettier-ignore
      title: `Getting Conversational Action Project (projectId: ${chalk.white.bold(ctx.projectId)})`,
      task: async () => {
        // Check if gactions CLI is installed.
        try {
          await execSync('gactions version');
        } catch (err) {
          throw new JovoCliError(
            'Jovo requires gactions CLI',
            JovoCliPlatformGoogleCA.PLATFORM_ID,
            'Install the gactions CLI following this guide: ' +
              'https://developers.google.com/assistant/conversational/quickstart#install_the_gactions_command-line_tool',
          );
        }

        try {
          const { stdout, stderr } = await execSync(
            `gactions pull --clean --force --project-id ${ctx.projectId}`,
            {
              cwd: platformPath,
            },
          );

          if (stderr) {
            console.log(Utils.printWarning(stderr));
            console.log(stdout);
            console.log('\n');
          }
        } catch (err) {
          if (err instanceof JovoCliError) {
            throw err;
          }

          throw getGActionsError(err.message);
        }
      },
    };

    return [task];
  }

  getBuildReverseTasks(ctx: JovoTaskContextGoogleCA): ListrTask[] {
    const task: ListrTask = {
      title: 'Reversing model files',
      task: () => {
        const localeTasks: ListrTask[] = [];
        const locales: string[] = this.getLocales(ctx.locales);
        const defaultLocale: string = locales[0];

        for (const locale of locales) {
          localeTasks.push({
            title: locale,
            task: () => {
              const isDefaultLocale = locale === defaultLocale;
              const platformFiles: NativeFileInformation[] = this.getPlatformModels(
                locale,
                isDefaultLocale,
              );

              const jovoModel = new JovoModelGoogle();
              jovoModel.importNative(platformFiles, locale);
              const nativeData: JovoModelData | undefined = jovoModel.exportJovoModel();

              if (!nativeData) {
                throw new JovoCliError(
                  'Something went wrong while exporting your Jovo model.',
                  JovoCliPlatformGoogleCA.PLATFORM_ID,
                );
              }

              nativeData.invocation = this.getPlatformInvocationName(locale, isDefaultLocale);

              project.saveModel(nativeData, locale);
            },
          });
        }

        return new Listr(localeTasks);
      },
    };

    return [task];
  }

  buildLanguageModel(
    modelLocale: string,
    resolvedLocale: string,
    stage: string,
    defaultLocale: string,
  ) {
    try {
      // Create platform folders.
      if (!existsSync(pathJoin(this.getPath(), 'custom', 'intents'))) {
        mkdirSync(pathJoin(this.getPath(), 'custom', 'intents'), { recursive: true });
      }

      if (!existsSync(pathJoin(this.getPath(), 'custom', 'types'))) {
        mkdirSync(pathJoin(this.getPath(), 'custom', 'types'), { recursive: true });
      }

      const model = this.getJovoModel(modelLocale, stage);

      const jovoModel = new JovoModelGoogle(model, resolvedLocale, defaultLocale);
      const modelFiles = jovoModel.exportNative();

      if (!modelFiles || modelFiles.length === 0) {
        // Should actually never happen but who knows
        throw new JovoCliError(
          `Could not build Google Conversational Action files for locale "${resolvedLocale}"!`,
          JovoCliPlatformGoogleCA.PLATFORM_ID,
        );
      }

      for (const file of modelFiles) {
        const fileName = file.path.pop()!;
        const modelPath = pathJoin(this.getPath(), ...file.path);

        if (!existsSync(modelPath)) {
          mkdirSync(modelPath);
        }

        writeFileSync(pathJoin(modelPath, fileName), yaml.stringify(file.content));
      }
    } catch (err) {
      if (err instanceof JovoCliError) {
        throw err;
      }

      throw new JovoCliError(err.message, JovoCliPlatformGoogleCA.PLATFORM_ID);
    }
  }

  getProjectLanguages(locale: string, stage?: string): string[] | undefined {
    return project.jovoConfigReader!.getConfigParameter(
      `googleAction.nlu.lang.${locale}`,
      stage,
    ) as string[];
  }

  getJovoModel(locale: string, stage?: string): JovoModelData {
    let model = project.getModel(locale);

    const concatArraysCustomizer = (objValue: any, srcValue: any) => {
      if (_.isArray(objValue)) {
        // Since _.merge simply overwrites the original array, concatenate them instead.
        return objValue.concat(srcValue);
      }
    };

    if (project.jovoConfigReader?.getConfigParameter(`languageModel.${locale}`, stage)) {
      model = _.mergeWith(
        model,
        project.jovoConfigReader!.getConfigParameter(`languageModel.${locale}`, stage),
        concatArraysCustomizer,
      );
    }

    if (
      project.jovoConfigReader!.getConfigParameter(
        `googleAction.conversational.languageModel.${locale}`,
        stage,
      )
    ) {
      model = _.mergeWith(
        model,
        project.jovoConfigReader!.getConfigParameter(
          `googleAction.conversational.languageModel.${locale}`,
          stage,
        ),
        concatArraysCustomizer,
      );
    }

    return model;
  }

  getProjectSettings(locale: string, stage?: string): GASettings {
    const invocationName = this.getInvocationName(locale, stage);

    const projectSettings: GASettings = {
      localizedSettings: {
        displayName: invocationName,
        pronunciation: invocationName,
      },
    };

    const localizedProjectSettings = project.jovoConfigReader!.getConfigParameter(
      `googleAction.localizedSettings.${locale}`,
      stage,
    ) as GASettings;

    if (localizedProjectSettings) {
      _.merge(projectSettings.localizedSettings, localizedProjectSettings);
    }

    return projectSettings;
  }

  getInvocationName(locale: string, stage?: string): string {
    const { invocation } = this.getJovoModel(locale, stage);

    if (typeof invocation === 'object') {
      const invocationName = invocation[JovoCliPlatformGoogleCA.PLATFORM_KEY];

      if (!invocationName) {
        throw new JovoCliError(
          `Can\'t find invocation name for locale ${locale}.`,
          JovoCliPlatformGoogleCA.PLATFORM_ID,
        );
      }

      return invocationName;
    }

    return invocation;
  }

  getCategory(stage?: string): string {
    return project.jovoConfigReader!.getConfigParameter('googleAction.category', stage) as string;
  }

  getPlatformConfigIds(project: Project, options: OutputFlags): object {
    let projectId;

    if (options && options['project-id']) {
      projectId = options['project-id'];
    } else {
      projectId = project.jovoConfigReader!.getConfigParameter(
        'googleAction.projectId',
        options.stage as string,
      );
    }

    if (!projectId) {
      throw new JovoCliError(
        "Couldn't find project-id.",
        JovoCliPlatformGoogleCA.PLATFORM_ID,
        'Please add a property "projectId" to your project.js file.',
      );
    }

    return { projectId };
  }

  getAdditionalCliOptions(command: string, options: InputFlags) {}

  validateAdditionalCliOptions(command: string, options: OutputFlags): boolean {
    return true;
  }

  getPlatformConfigValues(project: Project, options: OutputFlags): object {
    return {};
  }

  getModelValidator(): tv4.JsonSchema {
    return JovoModelGoogle.getValidator();
  }

  getPath() {
    return pathJoin(project.getProjectPath(), 'platforms', 'googleAction');
  }

  getDefaultLocale(stage?: string, locales?: string[]): string {
    let defaultLocale = project.jovoConfigReader!.getConfigParameter(
      'googleAction.defaultLocale',
      stage,
    ) as string;

    // ToDo: Test for locales === undefined.
    if (!defaultLocale && locales) {
      // If locales includes an english model, take english as default automatically.
      for (const locale of locales) {
        if (locale.includes('en')) {
          return 'en';
        }
      }
      // Get default locale from Jovo Models.
      defaultLocale = locales[0].substring(0, 2);
    }

    if (!defaultLocale) {
      throw new JovoCliError(
        'Could not find a default locale.',
        JovoCliPlatformGoogleCA.PLATFORM_ID,
        'Try adding a property "defaultLocale" to your project.js.',
      );
    }

    return defaultLocale;
  }

  hasPlatform(): boolean {
    try {
      return existsSync(pathJoin(this.getManifestPath()));
    } catch (err) {
      return false;
    }
  }

  getManifestPath() {
    return pathJoin(this.getPath(), 'manifest.yaml');
  }

  getLocales(locales?: string[] | string): string[] {
    const returnLocales: string[] = [];
    if (locales) {
      if (Array.isArray(locales)) {
        returnLocales.push(...locales);
      } else {
        returnLocales.push(locales);
      }
    } else {
      const settingsPath: string = pathJoin(this.getPath(), 'settings');
      const files: string[] = readdirSync(settingsPath);

      for (const file of files) {
        if (file === 'settings.yaml') {
          const content = readFileSync(pathJoin(settingsPath, file), 'utf-8');
          const settings = yaml.parse(content);
          returnLocales.unshift(settings.defaultLocale);
        } else {
          returnLocales.push(file);
        }
      }
    }

    return returnLocales;
  }

  getPlatformInvocationName(locale: string, isDefaultLocale: boolean): string {
    const path: string[] = [this.getPath(), 'settings'];

    if (!isDefaultLocale) {
      path.push(locale);
    }

    const settingsPath: string = pathJoin(...path, 'settings.yaml');
    const settingsFile: string = readFileSync(settingsPath, 'utf-8');
    const settings = yaml.parse(settingsFile);

    return settings.localizedSettings.displayName;
  }

  /**
   * Returns platform-specific intents and entities.
   */
  getPlatformModels(locale: string, isDefaultLocale: boolean = false): NativeFileInformation[] {
    const platformModels: NativeFileInformation[] = [];

    const modelPath: string = pathJoin(this.getPath(), 'custom');
    const foldersToInclude: string[] = ['intents', 'types'];

    for (const folder of foldersToInclude) {
      const path: string[] = [modelPath, folder];

      if (!isDefaultLocale) {
        path.push(locale);
      }

      const files: string[] = readdirSync(pathJoin(...path));

      const yamlRegex: RegExp = /.*\.yaml/g;
      for (const file of files) {
        if (yamlRegex.test(file)) {
          const fileContent = readFileSync(pathJoin(...path, file), 'utf-8');
          platformModels.push({
            path: [...path, file],
            content: yaml.parse(fileContent),
          });
        }
      }
    }

    return platformModels;
  }
}
