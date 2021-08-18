import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import _get from 'lodash.get';
import { homedir } from 'os';
import { v4 as uuidv4 } from 'uuid';
import { join as joinPaths } from 'path';

import { JovoCliError } from './JovoCliError';
import chalk from 'chalk';
import { Preset, JovoUserConfigFile } from './interfaces';
import { promptOverwrite } from './prompts';
import { ANSWER_CANCEL } from './constants';

export class JovoUserConfig {
  private config: JovoUserConfigFile;

  constructor() {
    this.config = this.get();
  }

  /**
   * Returns the path of the Jovo user config.
   */
  static getPath(): string {
    return joinPaths('.jovo', 'configv4');
  }

  /**
   * Loads and returns Jovo user config.
   */
  get(): JovoUserConfigFile {
    try {
      const data: string = readFileSync(joinPaths(homedir(), JovoUserConfig.getPath()), 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      // If file cannot be found, create it.
      if (error.code === 'ENOENT') {
        return this.create();
      }

      // Else propagate error.
      throw new JovoCliError({
        message: 'Error while trying to parse .jovo/configv4.',
        details: error.message,
      });
    }
  }

  /**
   * Saves the provided user config.
   * @param config - JovoUserConfig object.
   */
  save(config: JovoUserConfigFile): void {
    if (!existsSync(joinPaths(homedir(), '.jovo'))) {
      mkdirSync(joinPaths(homedir(), '.jovo'));
    }

    writeFileSync(joinPaths(homedir(), JovoUserConfig.getPath()), JSON.stringify(config, null, 2));
    this.config = config;
  }

  /**
   * Creates and returns a new Jovo user config.
   */
  private create(): JovoUserConfigFile {
    const config: JovoUserConfigFile = {
      webhook: {
        uuid: uuidv4(),
      },
      cli: {
        plugins: [
          '@jovotech/cli-command-build',
          '@jovotech/cli-command-deploy',
          '@jovotech/cli-command-get',
          '@jovotech/cli-command-new',
          '@jovotech/cli-command-run',
        ],
        presets: [
          {
            name: 'Default_TS',
            projectName: 'helloworld',
            locales: ['en'],
            platforms: [
              {
                name: 'Amazon Alexa',
                module: 'Alexa',
                cliModule: 'AlexaCli',
                package: '@jovotech/platform-alexa',
                description: 'Build apps for Amazon Alexa',
                tags: 'platforms',
              },
            ],
            linter: true,
            unitTesting: true,
          },
        ],
      },
    };

    if (!existsSync(joinPaths(homedir(), '.jovo'))) {
      mkdirSync(joinPaths(homedir(), '.jovo'));
    }

    writeFileSync(joinPaths(homedir(), JovoUserConfig.getPath()), JSON.stringify(config, null, 2));

    return config;
  }

  getParameter(path: string): object | string[] | string | undefined {
    return _get(this.config, path);
  }

  /**
   * Returns the webhook uuid for the current user from the Jovo user config.
   */
  getWebhookUuid(): string {
    return this.getParameter('webhook.uuid') as string;
  }

  /**
   * Gets array of presets defined inside .jovo/config.
   */
  getPresets(): Preset[] {
    return this.getParameter('cli.presets') as Preset[];
  }

  /**
   * Gets a preset from .jovo/config.
   * @param presetKey - Key for the preset.
   * @throws JovoCliError, if the preset could not be found.
   */
  getPreset(presetKey: string): Preset {
    const presets: Preset[] = this.getPresets();
    const preset: Preset | undefined = presets.find((preset) => preset.name === presetKey);

    if (!preset) {
      throw new JovoCliError({
        message: `Could not find preset ${presetKey}.`,
        details: 'Please check for spelling or check your .jovo/config.',
      });
    }

    return preset;
  }

  /**
   * Saves preset to .jovo/config.
   * @param preset - Preset to save.
   */
  async savePreset(preset: Preset): Promise<void> {
    // Check if preset already exists.
    if (this.config.cli.presets.find((p) => p.name === preset.name)) {
      const { overwrite } = await promptOverwrite(
        `Preset ${preset.name} already exists. Do you want to overwrite it?`,
      );
      if (overwrite === ANSWER_CANCEL) {
        throw new JovoCliError({ message: `Preset ${chalk.bold(preset.name)} already exists.` });
      } else {
        // Remove existing preset.
        this.config.cli.presets = this.config.cli.presets.filter((p) => p.name !== preset.name);
      }
    }

    this.config.cli.presets.push(preset);

    this.save(this.config);
  }
}
