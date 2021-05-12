import { join as joinPaths } from 'path';
import { JovoCliError, JovoCliPlugin, PluginHook, PluginType } from '@jovotech/cli-core';
import { BuildHook } from './hooks/build.hook';
import { LexCliConfig } from './utils';
import { DeployHook } from './hooks/deploy.hook';
import { LexModelFile } from 'jovo-model-lex';
import { existsSync } from 'fs';
import { GetHook } from './hooks/get.hook';

export class LexCli extends JovoCliPlugin {
  readonly $id: string = 'lex';
  readonly $type: PluginType = 'platform';
  readonly platformDirectory: string = 'platform.lex';
  readonly $config!: LexCliConfig;

  constructor(config?: LexCliConfig) {
    super(config);
  }

  getHooks(): typeof PluginHook[] {
    return [BuildHook, DeployHook, GetHook];
  }

  getPlatformPath(): string {
    return joinPaths(this.$cli.$project!.getBuildPath(), this.platformDirectory);
  }

  getDefaultConfig(): LexCliConfig {
    return {
      region: 'us-east-1',
      version: '$LATEST',
      childDirected: false,
      voiceId: '0',
      abortStatement: {
        messages: [
          {
            content: "Sorry, I didn't understand that.",
            contentType: 'PlainText',
          },
        ],
      },
      clarificationPrompt: {
        maxAttempts: 5,
        messages: [
          {
            content: 'Sorry, can you please repeat that?',
            contentType: 'PlainText',
          },
        ],
      },
      credentials: {
        accessKeyId: '<YOUR-ACCESS-KEY>',
        secretAccessKey: '<YOUR-SECRET-ACCESS-KEY>',
      },
    };
  }

  /**
   * Loads a previously built localized Lex model.
   * @param locale - Locale for the Lex model.
   */
  getLexModel(locale: string): LexModelFile | undefined {
    const modelPath: string = joinPaths(this.getPlatformPath(), `${locale}.json`);
    if (!existsSync(modelPath)) {
      return;
    }

    try {
      return require(joinPaths(this.getPlatformPath(), locale));
    } catch (error) {
      throw new JovoCliError(
        `Something went wrong while trying to load Lex model for locale ${locale}.`,
        this.constructor.name,
        error.message,
      );
    }
  }
}