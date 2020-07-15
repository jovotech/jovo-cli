import * as _ from 'lodash';
import * as Listr from 'listr';
import { ListrTask } from 'listr';
import * as crypto from 'crypto';
import axios, { AxiosRequestConfig } from 'axios';
import { join as pathJoin } from 'path';
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import {
  JovoCliPlatform,
  JovoTaskContext,
  getProject,
  JovoCliError,
  Utils,
  Project,
  OutputFlags,
  InputFlags,
} from 'jovo-cli-core';
import { JovoModelAlexa, AlexaModel } from 'jovo-model-alexa';
import { JovoModelData } from 'jovo-model';

const project = getProject();

export class JovoCliPlatformSpokestack extends JovoCliPlatform {
  static PLATFORM_KEY = 'spokestack';

  getBuildTasks(ctx: JovoTaskContext): ListrTask[] {
    const tasks: ListrTask[] = [];

    const title = `${this.hasPlatform() ? 'Updating' : 'Creating'} Spokestack project files`;

    tasks.push({
      title,
      task: () => {
        const localeTasks: ListrTask[] = [];

        for (const locale of ctx.locales!) {
          localeTasks.push({
            title: locale,
            task: async (ctx, task) => {
              if (locale.split('-')[0] !== 'en') {
                return task.skip(`Locale ${locale} is currently not supported by Spokestack.`);
              }

              this.buildLanguageModelSpokestack(locale, ctx.stage!);
              await Utils.wait(500);
            },
          });
        }

        return new Listr(localeTasks);
      },
    });

    return tasks;
  }

  getDeployTasks(ctx: JovoTaskContext): ListrTask[] {
    const tasks: ListrTask[] = [];

    tasks.push({
      title: 'Deploying to Spokestack API...',
      task: () => {
        const localeTasks: ListrTask[] = [];

        for (const mainLocale of ctx.locales!) {
          const deployLocales: string[] = [];
          if (mainLocale.length === 2) {
            deployLocales.push(...this.getSubLocales(mainLocale));
          } else {
            deployLocales.push(mainLocale);
          }

          for (const locale of deployLocales) {
            localeTasks.push({
              title: locale,
              task: async () => {
                const model = this.getModel(locale);

                // If project has multiple locales, trail the app name with the respective locale.
                const hasMultipleLocales = ctx.locales!.length > 1 || deployLocales.length > 1;
                const name = `${this.getName()}${hasMultipleLocales ? `_${locale}` : ''}`;

                // Initiate deployment process.
                const body = JSON.stringify({
                  query: `
                    mutation ($platform: String!, $name: String!, $body: String!) {
                      nluImport (platform: $platform, name: $name, body: $body)
                    }
                  `,
                  variables: {
                    platform: '226ed860-c4b0-4199-99b9-f363dbb0289e',
                    name,
                    body: JSON.stringify(model),
                  },
                });

                const signature = crypto
                  .createHmac('sha256', this.getKeySecret())
                  .update(body)
                  .digest('base64');

                const config: AxiosRequestConfig = {
                  data: body,
                  headers: {
                    'Authorization': `Spokestack ${this.getKeyId()}:${signature}`,
                    'Content-Type': 'application/json',
                  },
                  method: 'POST',
                  url: 'https://api.spokestack.io/v1',
                };

                try {
                  const res = await axios(config);

                  if (res.data?.errors) {
                    const err = res.data.errors[0];
                    throw new JovoCliError(
                      `Spokestack returned an error: ${err.message}`,
                      'jovo-cli-platform-spokestack',
                    );
                  }
                } catch (err) {
                  if (err instanceof JovoCliError) {
                    throw err;
                  }

                  if (err.isAxiosError) {
                    throw new JovoCliError(
                      `Spokestack returned an error with status code ${err.response.status}: ${err.response.statusText}`,
                      'jovo-cli-platform-spokestack',
                    );
                  } else {
                    throw new JovoCliError(err.message, 'jovo-cli-platform-spokestack');
                  }
                }
              },
            });
          }
        }

        return new Listr(localeTasks);
      },
    });

    return tasks;
  }

  buildLanguageModelSpokestack(locale: string, stage: string) {
    try {
      if (!existsSync(this.getModelsPath())) {
        mkdirSync(this.getModelsPath(), { recursive: true });
      }

      const model = this.getJovoModel(locale, stage);
      const jovoModel = new JovoModelAlexa(model, locale);
      const alexaModelFiles = jovoModel.exportNative();

      if (!alexaModelFiles || alexaModelFiles.length === 0) {
        throw new JovoCliError(
          `Could not build Spokestack files for locale "${locale}"!`,
          'jovo-cli-platform-spokestack',
        );
      }

      const locales: string[] = [];
      if (locale.length === 2) {
        try {
          const projectLocales = this.getSubLocales(locale, stage);
          locales.push(...projectLocales);
        } catch (err) {
          if (err instanceof JovoCliError) {
            throw err;
          }

          throw new JovoCliError(
            `Could not retrieve locales mapping for language "${locale}"!`,
            'jovo-cli-platform-spokestack',
          );
        }
      } else {
        locales.push(locale);
      }

      for (const targetLocale of locales) {
        writeFileSync(
          this.getModelPath(targetLocale),
          JSON.stringify(alexaModelFiles[0].content, null, '\t'),
        );
      }
    } catch (err) {
      if (err instanceof JovoCliError) {
        throw err;
      }

      throw new JovoCliError(err.message, 'jovo-cli-platform-spokestack');
    }
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
        `spokestack.conversational.languageModel.${locale}`,
        stage,
      )
    ) {
      model = _.mergeWith(
        model,
        project.jovoConfigReader!.getConfigParameter(
          `spokestack.conversational.languageModel.${locale}`,
          stage,
        ),
        concatArraysCustomizer,
      );
    }

    return model;
  }

  getSubLocales(locale: string, stage?: string): string[] {
    if (!project.jovoConfigReader!.getConfigParameter(`spokestack.nlu.lang.${locale}`, stage)) {
      throw new JovoCliError(
        `Could not retrieve locales mapping for language "${locale}"!`,
        'jovo-cli-platform-spokestack',
      );
    }

    return project.jovoConfigReader!.getConfigParameter(
      `spokestack.nlu.lang.${locale}`,
      stage,
    ) as string[];
  }

  getModelsPath(): string {
    return pathJoin(this.getPath(), 'models');
  }

  getModelPath(locale: string): string {
    return pathJoin(this.getModelsPath(), `${locale}.json`);
  }

  getModel(locale: string): AlexaModel {
    const modelBuffer = readFileSync(this.getModelPath(locale));
    return JSON.parse(modelBuffer.toString());
  }

  getKeyId(): string {
    const keyId = project.jovoConfigReader!.getConfigParameter('spokestack.keyId') as string;

    if (!keyId) {
      throw new JovoCliError(
        'You need to provide an identity key for your spokestack application.',
        'jovo-cli-platform-spokestack',
        'Please add the property "keyId" with your account\'s identity key to your project.js file.',
      );
    }

    return keyId;
  }

  getKeySecret(): string {
    const keySecret = project.jovoConfigReader!.getConfigParameter(
      'spokestack.keySecret',
    ) as string;

    if (!keySecret) {
      throw new JovoCliError(
        'You need to provide a secret key for your spokestack application.',
        'jovo-cli-platform-spokestack',
        'Please add the property "keySecret" with your account\'s secret key to your project.js file.',
      );
    }

    return keySecret;
  }

  getName(): string {
    const name = project.jovoConfigReader!.getConfigParameter('spokestack.name') as string;

    if (!name) {
      throw new JovoCliError(
        'You need to provide an app name for your spokestack application.',
        'jovo-cli-platform-spokestack',
        'Please add the property "name" to your project.js file.',
      );
    }

    return name;
  }

  /**
   * Returns true if project has spokestack platforms folder.
   *
   * @returns {boolean}
   */
  hasPlatform(): boolean {
    try {
      return existsSync(this.getModelsPath());
    } catch (err) {
      return false;
    }
  }

  getPlatformConfigIds(project: Project, options: OutputFlags): object {
    return {};
  }

  getAdditionalCliOptions(command: string, options: InputFlags) {}

  validateAdditionalCliOptions(command: string, options: OutputFlags): boolean {
    return true;
  }

  getPlatformConfigValues(project: Project, options: OutputFlags): object {
    return {};
  }

  getModelValidator(): tv4.JsonSchema {
    return JovoModelAlexa.getValidator();
  }
}
