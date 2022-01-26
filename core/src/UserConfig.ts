import chalk from 'chalk';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'fs';
import _get from 'lodash.get';
import _set from 'lodash.set';
import { homedir } from 'os';
import { join as joinPaths } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Log, PlainObjectType } from '.';
import { ANSWER_CANCEL } from './constants';
import { Preset } from './interfaces';
import { JovoCliError } from './JovoCliError';
import { promptOverwrite } from './prompts';

export class UserConfig {
  webhook!: {
    uuid: string;
  };
  cli!: {
    plugins: string[];
    presets: Preset[];
    omitHints?: boolean;
  };
  timeLastUpdateMessage?: string;

  static instance?: UserConfig;

  constructor() {
    Object.assign(this, this.load());

    // If the loaded config has v3 structure,
    // rename configv4 to config and deprecate the v3 config
    if (!this.cli) {
      // Rename the v3 config to config3
      renameSync(
        joinPaths(homedir(), UserConfig.getPath('v4')),
        joinPaths(homedir(), UserConfig.getPath('v3')),
      );

      // If configv4 exists, rename it, otherwise create a fresh config with this.load()
      if (existsSync(joinPaths(homedir(), '.jovo', 'configv4'))) {
        renameSync(
          joinPaths(homedir(), '.jovo', 'configv4'),
          joinPaths(homedir(), UserConfig.getPath('v4')),
        );
      }

      Log.spacer();
      Log.warning(
        `The Jovo CLI @v4 is now using ${UserConfig.getPath('v4')} as the default config.`,
      );
      Log.warning(`Your existing config has been moved to ${UserConfig.getPath('v3')}.`);
      Log.spacer();

      // Reload config if v3 was loaded and detected
      Object.assign(this, this.load());
    }

    // Save a default template for users with the beta configv4 file,
    // since the default template previously had the key "Default_TS"
    if (!this.cli.presets.find((preset) => preset.name === 'default')) {
      this.savePreset(this.getDefaultPreset());
    }

    if (!this.cli.plugins.find((plugin) => plugin === '@jovotech/cli-command-update')) {
      this.cli.plugins.push('@jovotech/cli-command-update');
      this.save();
    }
  }

  static getInstance(): UserConfig {
    if (!this.instance) {
      this.instance = new UserConfig();
    }

    return this.instance;
  }

  /**
   * Returns the path of the Jovo user config.
   */
  static getPath(version: 'v4' | 'v3' = 'v4'): string {
    return version === 'v4' ? joinPaths('.jovo', 'config') : joinPaths('.jovo', 'config3');
  }

  /**
   * Loads and returns Jovo user config.
   */
  load(): PlainObjectType<UserConfig> {
    try {
      const data: string = readFileSync(joinPaths(homedir(), UserConfig.getPath()), 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      // If file cannot be found, create it.
      if (error.code === 'ENOENT') {
        return this.create();
      }

      // Otherwise propagate error.
      throw new JovoCliError({
        message: `Error while trying to parse ${UserConfig.getPath()}.`,
        details: error.message,
      });
    }
  }

  /**
   * Saves the provided user config.
   * @param config - JovoUserConfig object.
   */
  save(config: PlainObjectType<UserConfig> = this): void {
    if (!existsSync(joinPaths(homedir(), '.jovo'))) {
      mkdirSync(joinPaths(homedir(), '.jovo'));
    }

    writeFileSync(joinPaths(homedir(), UserConfig.getPath()), JSON.stringify(config, null, 2));
    // Make sure the current instance is updated as well
    Object.assign(this, config);
  }

  /**
   * Creates and returns a new Jovo user config.
   */
  private create(): PlainObjectType<UserConfig> {
    const config: PlainObjectType<UserConfig> = {
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
          '@jovotech/cli-command-update',
        ],
        presets: [this.getDefaultPreset()],
      },
    };

    if (!existsSync(joinPaths(homedir(), '.jovo'))) {
      mkdirSync(joinPaths(homedir(), '.jovo'));
    }

    writeFileSync(joinPaths(homedir(), UserConfig.getPath()), JSON.stringify(config, null, 2));

    return config;
  }

  getParameter(path: string): unknown {
    return _get(this, path);
  }

  setParameter(path: string, value: unknown): void {
    _set(this, path, value);
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
    if (this.cli.presets.find((p: Preset) => p.name === preset.name)) {
      const { overwrite } = await promptOverwrite(
        `Preset ${preset.name} already exists. Do you want to overwrite it?`,
      );
      if (overwrite === ANSWER_CANCEL) {
        throw new JovoCliError({ message: `Preset ${chalk.bold(preset.name)} already exists.` });
      } else {
        // Remove existing preset.
        this.cli.presets = this.cli.presets.filter((p: Preset) => p.name !== preset.name);
      }
    }

    this.cli.presets.push(preset);

    this.save();
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
