import {
  GetBotCommand,
  GetBotCommandOutput,
  GetBotsCommand,
  GetBotsCommandOutput,
  LexModelBuildingServiceClient,
} from '@aws-sdk/client-lex-model-building-service';
import type { GetContext, GetEvents } from '@jovotech/cli-command-get';
import {
  ANSWER_CANCEL,
  flags,
  InstallContext,
  JovoCliError,
  PluginHook,
  printHighlight,
  printUserInput,
  prompt,
  promptOverwrite,
  Task,
  wait,
} from '@jovotech/cli-core';
import { existsSync, writeFileSync } from 'fs';
import { LexModelFile } from 'jovo-model-lex';
import { join as joinPaths } from 'path';
import { LexCli } from '..';

export interface LexGetContext extends GetContext {
  flags: GetContext['flags'] & { 'bot-name'?: string };
  lex: {
    botName?: string;
  };
}

export class GetHook extends PluginHook<GetEvents> {
  $plugin!: LexCli;
  $context!: LexGetContext;

  install(): void {
    this.middlewareCollection = {
      'install': [this.addCliOptions.bind(this)],
      'before.get': [
        this.checkForPlatform.bind(this),
        this.updatePluginContext.bind(this),
        this.checkForAwsCredentials.bind(this),
        this.checkForExistingPlatformFiles.bind(this),
      ],
      'get': [this.get.bind(this)],
    };
  }

  /**
   * Add platform-specific CLI options, including flags and args.
   * @param context - Context providing an access point to command flags and args.
   */
  addCliOptions(context: InstallContext): void {
    if (context.command !== 'get') {
      return;
    }

    context.flags['bot-name'] = flags.string({
      description: 'Name of Lex bot',
    });
  }

  /**
   * Checks if the currently selected platform matches this CLI plugin.
   * @param context - Context containing information after flags and args have been parsed by the CLI.
   */
  checkForPlatform(): void {
    // Check if this plugin should be used or not.
    if (this.$context.platform && this.$context.platform !== this.$plugin.$id) {
      this.uninstall();
    }
  }

  /**
   * Updates the current plugin context with platform-specific values.
   */
  updatePluginContext(): void {
    if (!this.$context.lex) {
      this.$context.lex = {};
    }

    this.$context.lex.botName = this.$context.flags['bot-name'] || this.$plugin.$config.name;
  }

  /**
   * Checks if all necessary credentials are set.
   */
  checkForAwsCredentials(): void {
    if (!this.$plugin.$config.credentials) {
      throw new JovoCliError({
        message: 'Could not find your AWS credentials.',
        module: this.$plugin.constructor.name,
      });
    }

    if (!this.$plugin.$config.credentials.accessKeyId) {
      throw new JovoCliError({
        message: 'Could not find accessKeyId for your AWS credentials.',
        module: this.$plugin.constructor.name,
      });
    }

    if (!this.$plugin.$config.credentials.secretAccessKey) {
      throw new JovoCliError({
        message: 'Could not find secretAccessKey for your AWS credentials.',
        module: this.$plugin.constructor.name,
      });
    }
  }

  /**
   * Checks if platform-specific files already exist and prompts for overwriting them.
   */
  async checkForExistingPlatformFiles(): Promise<void> {
    if (!this.$context.flags.overwrite && existsSync(this.$plugin.getPlatformPath())) {
      const answer = await promptOverwrite('Found existing project files. How to proceed?');
      if (answer.overwrite === ANSWER_CANCEL) {
        this.uninstall();
      }
    }
  }

  async get(): Promise<void> {
    try {
      const client: LexModelBuildingServiceClient = new LexModelBuildingServiceClient({
        region: this.$plugin.$config.region,
        credentials: this.$plugin.$config.credentials,
      });

      if (!this.$context.lex.botName) {
        const bots: { name: string; description?: string }[] = [];
        const getBotsTask: Task = new Task('Getting a list of all your bots', async () => {
          const command: GetBotsCommand = new GetBotsCommand({ maxResults: 50 });
          const response: GetBotsCommandOutput = await client.send(command);
          for (const bot of response.bots || []) {
            bots.push({ name: bot.name!, description: bot.description });
          }
        });
        await getBotsTask.run();

        const choices: prompt.Choice[] = bots.map((bot) => ({
          title: printUserInput(bot.name),
          description: bot.description,
          value: bot.name,
        }));
        const { botName } = await this.promptForBot(choices);
        this.$context.lex.botName = botName;
      }

      const getTask: Task = new Task(
        `Getting configuration for Lex bot ${printHighlight(this.$context.lex.botName)}`,
        async () => {
          const command: GetBotCommand = new GetBotCommand({
            name: this.$context.lex.botName,
            versionOrAlias: '$LATEST',
          });

          const response: GetBotCommandOutput = await client.send(command);
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          delete response.$metadata;
          const lexModel: LexModelFile = {
            metadata: {
              schemaVersion: '1.0',
              importType: 'LEX',
              importFormat: 'JSON',
            },
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            resource: response,
          };
          writeFileSync(
            joinPaths(this.$plugin.getPlatformPath(), `${response.locale!}.json`),
            JSON.stringify(lexModel, null, 2),
          );
          await wait(500);
        },
      );
      await getTask.run();
    } catch (error) {
      throw new JovoCliError({ message: error.message, module: this.$plugin.constructor.name });
    }
  }

  async promptForBot(choices: prompt.Choice[]): Promise<{ botName: string }> {
    return await prompt(
      {
        name: 'botName',
        type: 'select',
        message: 'Select your bot:',
        choices,
      },
      {
        onCancel() {
          process.exit();
        },
      },
    );
  }
}
