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
import { JovoModelAlexa } from 'jovo-model-alexa';

const project = getProject();

export class JovoCliPlatformSpokestack extends JovoCliPlatform {
  static PLATFORM_KEY = 'spokestack';

  getBuildTasks(ctx: JovoTaskContext): ListrTask[] {
    const tasks: ListrTask[] = [];

    tasks.push({
      title: 'Building language model files...',
      task: () => {
        const localeTasks: ListrTask[] = [];

        for (const locale of ctx.locales!) {
          localeTasks.push({
            title: locale,
            task: async () => {
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

                // Initiate deployment process.
                const body = JSON.stringify({
                  query: `
                    mutation ($platform: String!, $name: String!, $body: String!) {
                      nluImport (platform: $platform, name: $name, body: $body)
                    }
                  `,
                  variables: {
                    platform: '226ed860-c4b0-4199-99b9-f363dbb0289e',
                    name: this.getName(),
                    body: model,
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
                  await axios(config);
                } catch (err) {
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

      // ToDo: Get model from project.spokestack property.

      const jovoModel = new JovoModelAlexa(model, locale);
      const alexaModelFiles = jovoModel.exportNative();

      if (!alexaModelFiles || alexaModelFiles.length === 0) {
        throw new JovoCliError(
          `Could not build Alexa files for locale "${locale}"!`,
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

      if (!existsSync(this.getModelsPath())) {
        mkdirSync(this.getModelsPath(), { recursive: true });
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

  getModel(locale: string): object {
    const modelBuffer = readFileSync(this.getModelPath(locale));
    return JSON.parse(modelBuffer.toString());
  }

  getKeyId(): string {
    return project.jovoConfigReader!.getConfigParameter('spokestack.keyId') as string;
  }

  getKeySecret(): string {
    return project.jovoConfigReader!.getConfigParameter('spokestack.keySecret') as string;
  }

  getName(): string {
    return project.jovoConfigReader!.getConfigParameter('spokestack.name') as string;
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
    return {};
  }
}
