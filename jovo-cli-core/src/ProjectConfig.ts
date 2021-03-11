import _cloneDeep from 'lodash.clonedeep';
import _get from 'lodash.get';
import _merge from 'lodash.merge';
import { join as joinPaths } from 'path';

import { JovoCliError } from './JovoCliError';
import { ProjectConfigObject } from './utils';

export class ProjectConfig {
  constructor(private projectPath: string, private stage: string = '') {}

  /**
   * Returns configuration, considering the stage. If no stage is set, just returns this.getConfigContent().
   * ToDo: Staging!!! Not only in project.js, but also project.dev.js
   */
  get(): ProjectConfigObject {
    const configContent: ProjectConfigObject = this.getContent();

    if (this.stage) {
      const stagedConfig: ProjectConfigObject | undefined = _get(
        configContent,
        `stages.${this.stage}`,
      );
      if (stagedConfig) {
        _merge(configContent, stagedConfig);
      }
    }
    return configContent;
  }

  /**
   * Reads and returns the content of the project's config file.
   */
  getContent(): ProjectConfigObject {
    try {
      const config: ProjectConfigObject = _cloneDeep(require(this.getPath()));
      return config;
    } catch (error) {
      throw new JovoCliError(
        'Could not load project configuration.',
        'jovo-cli-core',
        error.message,
      );
    }
  }

  /**
   * Returns path to Jovo config file.
   */
  getPath(): string {
    return joinPaths(this.projectPath, ProjectConfig.getFileName());
  }

  /**
   * Returns the name of the Jovo config file.
   */
  static getFileName(): string {
    return 'jovo.project.js';
  }
}
