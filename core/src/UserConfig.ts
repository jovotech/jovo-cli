import chalk from 'chalk';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'fs';
import _get from 'lodash.get';
import { homedir } from 'os';
import { join as joinPaths } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Log } from '.';
import { ANSWER_CANCEL } from './constants';
import { JovoUserConfigFile, Preset } from './interfaces';
import { JovoCliError } from './JovoCliError';
import { promptOverwrite } from './prompts';

export class UserConfig {
  private config: JovoUserConfigFile;

  constructor() {
    this.config = this.get();

    // Rename the configv4 to config and deprecate the v3 config
    if (!this.config.cli) {
      // Rename the v3 config to config3
      renameSync(joinPaths(homedir(), this.path), joinPaths(homedir(), this.pathV3));

      // If configv4 exists, rename it, otherwise create a fresh config
      if (existsSync(joinPaths(homedir(), '.jovo', 'configv4'))) {
        renameSync(joinPaths(homedir(), '.jovo', 'configv4'), joinPaths(homedir(), this.path));
      } else {
        this.create();
      }

      Log.spacer();
      Log.warning(`The Jovo CLI @v4 is now using ${this.path} as the default config.`);
      Log.warning(`Your existing config has been moved to ${this.pathV3}.`);
      Log.spacer();

      this.config = this.get();
    }

    // Save a default template for users with the beta configv4 file,
    // since the default template previously had the key "Default_TS"
    if (!this.config?.cli?.presets?.find((preset) => preset.name === 'default')) {
      this.savePreset(this.getDefaultPreset());
    }
  }

  /**
   * Returns the path of the Jovo user config
   */
  get path(): string {
    return joinPaths(this.directory, 'config');
  }

  /**
   * Returns the path of the Jovo user config @v3.
   */
  get pathV3(): string {
    return joinPaths(this.directory, 'config3');
  }

  /**
   * Returns the directory for Jovo config files
   */
  get directory(): string {
    return '.jovo';
  }

  /**
   * Loads and returns Jovo user config.
   */
  get(): JovoUserConfigFile {
    try {
      const data: string = readFileSync(joinPaths(homedir(), this.path), 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      // If file cannot be found, create it.
      if ((error as { code: string }).code === 'ENOENT') {
        return this.create();
      }

      // Else propagate error.
      throw new JovoCliError({
        message: `Error while trying to parse ${this.path}.`,
        details: (error as Error).message,
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

    writeFileSync(joinPaths(homedir(), this.path), JSON.stringify(config, null, 2));
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
        presets: [this.getDefaultPreset()],
      },
    };

    if (!existsSync(joinPaths(homedir(), '.jovo'))) {
      mkdirSync(joinPaths(homedir(), '.jovo'));
    }

    writeFileSync(joinPaths(homedir(), this.path), JSON.stringify(config, null, 2));

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

    //

    if (!preset) {
      throw new JovoCliError({
        message: `Could not find preset ${presetKey}.`,
        hint: 'Please check for spelling or check your .jovo/config.',
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

  private getDefaultPreset(): Preset {
    return {
      name: 'default',
      projectName: 'helloworld',
      locales: ['en'],
      platforms: [],
      language: 'typescript',
    };
  }
}
