import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import _cloneDeep from 'lodash.clonedeep';
import _get from 'lodash.get';
import _merge from 'lodash.merge';
import _set from 'lodash.set';
import { homedir } from 'os';
import { v4 as uuidv4 } from 'uuid';
import { join as joinPaths } from 'path';

import { JovoCliError } from '.';
import { JovoCliPreset, JovoUserConfigFile } from './utils';

export class JovoUserConfig {
  /**
   * Returns the path of the Jovo user config.
   */
  getPath(): string {
    return joinPaths('.jovo', 'config');
  }

  /**
   * Loads and returns Jovo user config.
   */
  get(): JovoUserConfigFile {
    try {
      const data: string = readFileSync(joinPaths(homedir(), this.getPath()), 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      // If file cannot be found, create it.
      if (error.code === 'ENOENT') {
        return this.create();
      }

      // Else propagate error.
      throw new JovoCliError(
        'Error while trying to parse ./jovo/config.',
        'jovo-cli-core',
        error.message,
      );
    }
  }

  /**
   * Saves the provided user config.
   * @param config - JovoUserConfig object.
   */
  save(config: JovoUserConfigFile) {
    if (!existsSync(joinPaths(homedir(), '.jovo'))) {
      mkdirSync(joinPaths(homedir(), '.jovo'));
    }

    writeFileSync(joinPaths(homedir(), '.jovo', 'config'), JSON.stringify(config, null, 2));
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
        plugins: ['jovo-cli-command-new', 'jovo-cli-command-run'],
        presets: [
          {
            name: 'Default (JS)',
            key: 'defaultJs',
            projectName: 'helloworld',
            template: 'helloworld',
            locales: ['en'],
            language: 'javascript',
            platforms: [],
            linter: true,
            unitTesting: true,
          },
        ],
      },
    };

    if (!existsSync(joinPaths(homedir(), '.jovo'))) {
      mkdirSync(joinPaths(homedir(), '.jovo'));
    }

    writeFileSync(joinPaths(homedir(), this.getPath()), JSON.stringify(config, null, 2));

    return config;
  }

  /**
   * Returns the webhook uuid for the current user from the Jovo user config.
   */
  getWebhookUuid(): string {
    const config: JovoUserConfigFile = this.get();
    return config.webhook.uuid;
  }

  /**
   * Gets array of presets defined inside .jovo/config.
   */
  getPresets(): JovoCliPreset[] {
    const config: JovoUserConfigFile = this.get();
    return config.cli.presets;
  }

  /**
   * Gets a preset from .jovo/config.
   * @param presetKey - Key for the preset.
   * @throws JovoCliError, if the preset could not be found.
   */
  getPreset(presetKey: string): JovoCliPreset {
    const config: JovoUserConfigFile = this.get();

    const presets: JovoCliPreset[] = _get(config, 'cli.presets');
    const preset: JovoCliPreset | undefined = presets.find((preset) => preset.key === presetKey);

    if (!preset) {
      throw new JovoCliError(
        `Could not find preset ${presetKey}.`,
        'jovo-cli-core',
        'Please check for spelling or check your .jovo/config.',
      );
    }

    return preset;
  }

  /**
   * Saves preset to .jovo/config.
   * @param preset - Preset to save.
   */
  savePreset(preset: JovoCliPreset) {
    const config: JovoUserConfigFile = this.get();

    // Check if preset already exists.
    if (config.cli.presets.find((p) => p.key === preset.key)) {
      throw new JovoCliError(`Preset ${preset.key} already exists.`, 'jovo-cli-core');
    }

    config.cli.presets.push(preset);

    this.save(config);
  }
}
