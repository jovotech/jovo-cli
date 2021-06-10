import { join as joinPaths } from 'path';
import { JovoCliError, PluginHook, printHighlight, ROCKET, Task } from '@jovotech/cli-core';
import type { DeployPlatformContext, DeployPlatformEvents } from '@jovotech/cli-command-deploy';
import {
  GetBotCommand,
  GetBotCommandOutput,
  GetIntentCommand,
  GetIntentCommandOutput,
  LexModelBuildingServiceClient,
  PutBotCommand,
  PutBotResponse,
  PutIntentCommand,
  PutIntentCommandOutput,
} from '@aws-sdk/client-lex-model-building-service';
import { existsSync, writeFileSync } from 'fs';
import type { LexModelFile } from 'jovo-model-lex';

import { LexCli } from '..';
import { getLexLocale, LexIntent } from '../utils';

export class DeployHook extends PluginHook<DeployPlatformEvents> {
  $plugin!: LexCli;
  $context!: DeployPlatformContext;

  install(): void {
    this.middlewareCollection = {
      'before.deploy:platform': [
        this.checkForPlatform.bind(this),
        this.checkForPlatformsFolder.bind(this),
        this.checkForAwsCredentials.bind(this),
      ],
      'deploy:platform': [this.deploy.bind(this)],
    };
  }

  /**
   * Checks if the currently selected platform matches this CLI plugin.
   * @param context - Context containing information after flags and args have been parsed by the CLI.
   */
  checkForPlatform(): void {
    // Check if this plugin should be used or not.
    if (this.$context.args.platform && this.$context.args.platform !== this.$plugin.$id) {
      this.uninstall();
    }
  }

  /**
   * Checks if the platform folder for the current plugin exists.
   */
  checkForPlatformsFolder(): void {
    if (!existsSync(this.$plugin.getPlatformPath())) {
      throw new JovoCliError(
        `Couldn't find the platform folder "${this.$plugin.platformDirectory}/".`,
        this.$plugin.constructor.name,
        `Please use "jovo build" to create platform-specific files.`,
      );
    }
  }

  /**
   * Checks if all necessary credentials are set.
   */
  checkForAwsCredentials(): void {
    if (!this.$plugin.$config.credentials) {
      throw new JovoCliError('Could not find your AWS credentials.', this.$plugin.constructor.name);
    }

    if (!this.$plugin.$config.credentials.accessKeyId) {
      throw new JovoCliError(
        'Could not find accessKeyId for your AWS credentials.',
        this.$plugin.constructor.name,
      );
    }

    if (!this.$plugin.$config.credentials.secretAccessKey) {
      throw new JovoCliError(
        'Could not find secretAccessKey for your AWS credentials.',
        this.$plugin.constructor.name,
      );
    }
  }

  async deploy(): Promise<void> {
    try {
      const locale: string = getLexLocale(
        this.$plugin.getPlatformPath(),
        this.$context.locales,
        this.$plugin.$config.locales,
      );
      const deployTask: Task = new Task(
        `${ROCKET} Deploying your Lex model for locale ${printHighlight(locale)}`,
      );
      const client = new LexModelBuildingServiceClient({
        region: this.$plugin.$config.region,
        credentials: this.$plugin.$config.credentials,
      });

      const lexModel: LexModelFile | undefined = this.$plugin.getLexModel(locale)!;

      // In the case that the checksum for an intent is falsy, this function can be called again after fetching the correct checksum.
      const deployIntent = async (intent: LexIntent) => {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const putIntentCommand: PutIntentCommand = new PutIntentCommand(intent);
        const response: PutIntentCommandOutput = await client.send(putIntentCommand);
        intent.checksum = response.checksum;
      };

      const deployIntentTask: Task = new Task('Uploading intents', async () => {
        // Deploy intents to Lex.
        for (const intent of lexModel.resource.intents || []) {
          try {
            await deployIntent(intent);
          } catch (error) {
            if (error.name === 'PreconditionFailedException') {
              const getIntentCommand: GetIntentCommand = new GetIntentCommand({
                name: intent.name,
                version: '$LATEST',
              });
              const response: GetIntentCommandOutput = await client.send(getIntentCommand);
              (intent as LexIntent).checksum = response.checksum;
              await deployIntent(intent);
            } else {
              throw error;
            }
          }
        }
      });

      const deployBot = async () => {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        lexModel.resource.intents = (lexModel.resource.intents || []).map((intent) => ({
          intentName: intent.name,
          intentVersion: intent.version,
          ...intent,
        }));
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const putBotCommand: PutBotCommand = new PutBotCommand(lexModel.resource);
        const response: PutBotResponse = await client.send(putBotCommand);
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        lexModel.resource.checksum = response.checksum;
        this.writeLexModel(lexModel, locale);
      };

      const deployBotTask: Task = new Task('Uploading bot configuration', async () => {
        try {
          await deployBot();
        } catch (error) {
          if (error.name === 'PreconditionFailedException') {
            const getBotCommand: GetBotCommand = new GetBotCommand({
              name: lexModel.resource.name,
              versionOrAlias: '$LATEST',
            });
            const response: GetBotCommandOutput = await client.send(getBotCommand);
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            lexModel.resource.checksum = response.checksum;
            await deployBot();
          } else {
            throw error;
          }
        }
      });

      deployTask.add(deployIntentTask, deployBotTask);
      await deployTask.run();
    } catch (error) {
      if (error instanceof JovoCliError) {
        throw error;
      }
      throw new JovoCliError(error.message, this.$plugin.constructor.name);
    }
  }

  writeLexModel(model: LexModelFile, locale: string): void {
    const path: string = joinPaths(this.$plugin.getPlatformPath(), `${locale}.json`);
    writeFileSync(path, JSON.stringify(model, null, 2));
  }
}
