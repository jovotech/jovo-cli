import _cloneDeep from 'lodash.clonedeep';
import _get from 'lodash.get';
import _merge from 'lodash.merge';
import { join as joinPaths } from 'path';

import { JovoCliError } from './JovoCliError';
import { ProjectConfig } from './utils';

export class Config {
  private stage: string;
  private projectPath: string;

  constructor(projectPath: string, stage: string = '') {
    this.projectPath = projectPath;
    this.stage = stage;
  }

  /**
   * Returns configuration, considering the stage. If no stage is set, just returns this.getConfigContent().
   * ToDo: Staging!!! Not only in project.js, but also project.dev.js
   */
  get(): ProjectConfig {
    const configContent: ProjectConfig = this.getContent();

    if (this.stage) {
      const stagedConfig: ProjectConfig | undefined = _get(configContent, `stages.${this.stage}`);
      if (stagedConfig) {
        _merge(configContent, stagedConfig);
      }
    }
    return configContent;
  }

  /**
   * Reads and returns the content of the project's config file.
   */
  getContent(): ProjectConfig {
    try {
      const config: ProjectConfig = _cloneDeep(require(this.getPath()));
      return config;
    } catch (error) {
      throw new JovoCliError('Could not load project configuration.', 'jovo-cli-core', error.message);
    }
  }

  /**
   * Returns path to Jovo config file.
   */
  getPath(): string {
    return joinPaths(this.projectPath, this.getFileName());
  }

  /**
   * Returns the name of the Jovo config file.
   */
  getFileName(): string {
    return 'project.js';
  }
}
