import { flags } from '@oclif/command';
import { ListrTask } from 'listr';
import * as Listr from 'listr';
import { join as pathJoin, resolve } from 'path';
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
import { JovoModelData, NativeFileInformation } from 'jovo-model';
import { JovoModelGoogle } from 'jovo-model-google';

import {
  JovoTaskContextGoogleCA,
  GAProjectLanguages,
  getGActionsError,
  GOOGLE_ACTIONS_TEST_HINT,
  GAWebhooks,
  GAProjectSettings,
  GALocalizedProjectSettings,
} from './utils';

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
            // @ts-ignore
            _.merge(ctx, this.getPlatformConfigIds(project, ctx));

            const localeTasks: ListrTask[] = [];
            for (const [modelLocale, resolvedLocales] of Object.entries(projectLocales)) {
              for (const locale of resolvedLocales) {
                localeTasks.push({
                  title: locale,
                  task: async () => {
                    const settings: GAProjectSettings = {
                      defaultLocale,
                      projectId: ctx.projectId,
                    };

                    const projectSettings: GAProjectSettings = this.getProjectSettings(ctx.stage);
                    const localizedProjectSettings: GALocalizedProjectSettings = this.getLocalizedProjectSettings(
                      modelLocale,
                      ctx.stage,
                    );

                    _.merge(settings, projectSettings, {
                      localizedSettings: localizedProjectSettings,
                    });

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
                      yaml.stringify(settings),
                    );
                    await Utils.wait(500);
                  },
                });
              }
            }

            return new Listr(localeTasks);
          },
        };

        const buildWebhookTask: ListrTask = {
          title: 'Generating webhook...',
          task: async () => {
            const webhooks: GAWebhooks = {
              ActionsOnGoogleFulfillment: {
                handlers: [
                  {
                    name: 'Jovo',
                  },
                ],
                httpsEndpoint: {
                  baseUrl: `${JOVO_WEBHOOK_URL}/${project.getWebhookUuid()}`,
                },
              },
            };

            _.merge(webhooks, this.getProjectWebhooks(ctx.stage));

            const webhookPath = pathJoin(this.getPath(), 'webhooks');

            if (!existsSync(webhookPath)) {
              mkdirSync(webhookPath, { recursive: true });
            }

            for (const [name, content] of Object.entries(webhooks)) {
              writeFileSync(pathJoin(webhookPath, `${name}.yaml`), yaml.stringify(content));
            }
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

        // Build manifest.yaml without including it within a task.
        const manifest = {
          version: '1.0',
        };
        writeFileSync(this.getManifestPath(), yaml.stringify(manifest));

        buildTasks.push(buildSettingsTask, buildWebhookTask, buildLanguageModelsTask);

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

        if (!ctx.projectId) {
          throw new JovoCliError(
            'Could not find projectId.',
            JovoCliPlatformGoogleCA.PLATFORM_ID,
            'Please provide a project id by using the flag "--project-id" or in your project.js.',
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
            // Cut out sentence about testing with gactions CLI.
            const hint: string = stdout.replace(GOOGLE_ACTIONS_TEST_HINT, '');
            console.log(Utils.printWarning(stderr));
            console.log(hint);
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

        if (!ctx.projectId) {
          throw new JovoCliError(
            'Could not find projectId.',
            JovoCliPlatformGoogleCA.PLATFORM_ID,
            'Please provide a project id by using the flag "--project-id" or in your project.js.',
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

      const actions: { custom: { [key: string]: object } } = {
        custom: {
          'actions.intent.MAIN': {},
        },
      };

      for (const file of modelFiles) {
        const fileName = file.path.pop()!;
        const modelPath = pathJoin(this.getPath(), ...file.path);

        if (!existsSync(modelPath)) {
          mkdirSync(modelPath, { recursive: true });
        }

        // Register actions.
        if (file.path.includes('intents')) {
          actions.custom[fileName.replace('.yaml', '')] = {};
        }

        writeFileSync(pathJoin(modelPath, fileName), file.content);
      }

      // Merge existing actions file with configuration in project.js.
      _.merge(actions, this.getProjectActions(stage));

      const actionsPath: string = pathJoin(this.getPath(), 'actions');
      if (!existsSync(actionsPath)) {
        mkdirSync(actionsPath, { recursive: true });
      }
      writeFileSync(pathJoin(this.getPath(), 'actions', 'actions.yaml'), yaml.stringify(actions));
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
      project.jovoConfigReader!.getConfigParameter(`googleAction.languageModel.${locale}`, stage)
    ) {
      model = _.mergeWith(
        model,
        project.jovoConfigReader!.getConfigParameter(`googleAction.languageModel.${locale}`, stage),
        concatArraysCustomizer,
      );
    }

    return model;
  }

  /**
   * Gets actions object from project.js
   * @param stage - Optional configuration stage.
   */
  getProjectActions(stage?: string) {
    const actions = project.jovoConfigReader!.getConfigParameter(
      'googleAction.manifest.actions',
      stage,
    );
    return actions;
  }

  getProjectWebhooks(stage?: string): GAWebhooks {
    const webhooks = project.jovoConfigReader!.getConfigParameter(
      'googleAction.manifest.webhooks',
      stage,
    ) as GAWebhooks;
    return webhooks;
  }

  getProjectSettings(stage?: string): GAProjectSettings {
    const projectSettings = project.jovoConfigReader!.getConfigParameter(
      `googleAction.manifest.settings`,
      stage,
    ) as GAProjectSettings;

    delete projectSettings.localizedSettings;

    return projectSettings;
  }

  getLocalizedProjectSettings(locale: string, stage?: string): GALocalizedProjectSettings {
    const invocationName = this.getInvocationName(locale, stage);

    const projectSettings: GALocalizedProjectSettings = {
      displayName: invocationName,
      pronunciation: invocationName,
    };

    const localizedProjectSettings = project.jovoConfigReader!.getConfigParameter(
      `googleAction.manifest.settings.localizedSettings.${locale}`,
      stage,
    ) as GALocalizedProjectSettings;

    if (localizedProjectSettings) {
      _.merge(projectSettings, localizedProjectSettings);
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

  getPlatformConfigIds(project: Project, options: OutputFlags): object {
    let projectId;

    if (options && options['project-id']) {
      projectId = options['project-id'];
    } else {
      projectId =
        project.jovoConfigReader!.getConfigParameter(
          'googleAction.projectId',
          options.stage as string,
        ) ||
        project.jovoConfigReader!.getConfigParameter(
          'googleAction.manifest.settings.projectId',
          options.stage as string,
        );
    }

    return { projectId };
  }

  getAdditionalCliOptions(command: string, options: InputFlags) {
    if (['get', 'build', 'deploy'].includes(command)) {
      options['project-id'] = flags.string({
        description: 'Google Cloud Project ID',
      });
    }
  }

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
      'googleAction.manifest.settings.defaultLocale',
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
    const foldersToInclude: string[] = ['intents', 'types', 'scenes', 'global'];

    for (const folder of foldersToInclude) {
      const path: string[] = [modelPath, folder];

      if (!isDefaultLocale) {
        path.push(locale);
      }

      const folderPath = pathJoin(...path);

      if (!existsSync(folderPath)) {
        continue;
      }

      let files: string[] = readdirSync(pathJoin(...path));

      if (folder === 'global') {
        files = files.filter((file) => file.includes('actions.intent'));
      }

      const yamlRegex: RegExp = /.*\.yaml/;
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
