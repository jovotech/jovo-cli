import { JovoCliError, JovoCliPlugin, PluginHook, PluginType } from '@jovotech/cli-core';
import { LexModelFile } from '@jovotech/model-lex';
import { existsSync } from 'fs';
import { join as joinPaths } from 'path';
import { BuildHook } from './hooks/BuildHook';
import { DeployHook } from './hooks/DeployHook';
import { GetHook } from './hooks/GetHook';
import { LexCliConfig } from './interfaces';

declare module '@jovotech/cli-core/dist/PluginCommand' {
  export interface PluginHook {
    $plugin: LexCli;
  }
}

export class LexCli extends JovoCliPlugin {
  readonly id: string = 'lex';
  readonly type: PluginType = 'platform';
  readonly platformDirectory: string = 'platform.lex';
  readonly config!: LexCliConfig;

  constructor(config?: LexCliConfig) {
    super(config);
  }

  getHooks(): typeof PluginHook[] {
    return [BuildHook, DeployHook, GetHook];
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

  get platformPath(): string {
    return joinPaths(this.$cli.project!.getBuildPath(), this.platformDirectory);
  }

  /**
   * Loads a previously built localized Lex model.
   * @param locale - Locale for the Lex model.
   */
  getLexModel(locale: string): LexModelFile | undefined {
    const modelPath: string = joinPaths(this.platformPath, `${locale}.json`);
    if (!existsSync(modelPath)) {
      return;
    }

    try {
      return require(joinPaths(this.platformPath, locale));
    } catch (error) {
      throw new JovoCliError({
        message: `Something went wrong while trying to load Lex model for locale ${locale}.`,
        module: this.constructor.name,
        details: (error as Error).message,
      });
    }
  }
}
