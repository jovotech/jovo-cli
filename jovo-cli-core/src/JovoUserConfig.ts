import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import _cloneDeep from 'lodash.clonedeep';
import _get from 'lodash.get';
import _merge from 'lodash.merge';
import { homedir } from 'os';
import { v4 as uuidv4 } from 'uuid';
import { join as joinPaths } from 'path';

import { JovoCliError } from '.';
import { JovoUserConfigFile } from './utils';

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
      throw new JovoCliError(`The Jovo config at ${this.getPath()} is missing!`, 'jovo-cli');
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

    writeFileSync(joinPaths(homedir(), '.jovo/config'), JSON.stringify(config, null, 2));
  }

  /**
   * Creates and returns a new Jovo user config.
   */
  create(): JovoUserConfigFile {
    const config: JovoUserConfigFile = {
      webhook: {
        uuid: uuidv4(),
      },
    };

    if (!existsSync(joinPaths(homedir(), '.jovo'))) {
      mkdirSync(joinPaths(homedir(), '.jovo'));
    }

    writeFileSync(this.getPath(), JSON.stringify(config, null, 2));

    return config;
  }

  /**
   * Returns the webhook uuid for the current user from the Jovo user config.
   */
  getWebhookUuid(): string {
    let config: JovoUserConfigFile;
    try {
      // ToDo: Test if this can fail, if a user config exists, but no id is given??
      config = this.get();
    } catch (error) {
      config = this.create();
    }
    return config.webhook.uuid;
  }
}
