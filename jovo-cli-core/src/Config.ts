import _cloneDeep from 'lodash.clonedeep';
import _get from 'lodash.get';
import _merge from 'lodash.merge';
import _mergeWith from 'lodash.mergewith';
import { join as joinPaths } from 'path';

import { JovoCliError } from './JovoCliError';
import { mergeArrayCustomizer, ProjectConfigObject } from './utils';
import { JovoCliPlugin } from './JovoCliPlugin';

export class Config {
  private readonly config: ProjectConfigObject;

  constructor(private projectPath: string, private stage?: string) {
    const configContent: ProjectConfigObject = this.getContent();
    if (!stage) {
      this.stage = _get(configContent, 'defaultStage');
    }

    this.config = this.get();
  }

  /**
   * Returns configuration, considering the stage. If no stage is set, just returns this.getConfigContent().
   */
  get(): ProjectConfigObject {
    const config: ProjectConfigObject = this.getContent();

    if (this.stage) {
      const stagedConfig: ProjectConfigObject | undefined = _get(config, `stages.${this.stage}`);
      if (stagedConfig) {
        _mergeWith(config, stagedConfig, mergeArrayCustomizer);

        // Merge plugins with the same constructor.
        const plugins: JovoCliPlugin[] = config.plugins || [];
        const mergedPlugins: { [constructor: string]: JovoCliPlugin } = {};

        for (const plugin of plugins) {
          if (!(plugin instanceof JovoCliPlugin)) {
            throw new JovoCliError(
              `Plugin ${plugin} is not an instance of JovoCliPlugin.`,
              'JovoCliCore',
              'Make sure your plugin inherits JovoCliPlugin provided by jovo-cli-core.',
            );
          }

          const constructor: string = plugin.constructor.name;
          // ! This has a potential runtime of O(n²).
          if (!Object.keys(mergedPlugins).includes(constructor)) {
            mergedPlugins[constructor] = plugin;
          } else {
            _merge(mergedPlugins[constructor], plugin);
          }
        }
        config.plugins = Object.values(mergedPlugins);
        delete config.stages;
      }
    }
    return config;
  }

  /**
   * Reads and returns the content of the project's config file.
   */
  getContent(): ProjectConfigObject {
    try {
      const config: ProjectConfigObject = require(this.getPath());
      return config;
    } catch (error) {
      throw new JovoCliError(
        'Could not load project configuration.',
        'jovo-cli-core',
        error.message,
      );
    }
  }

  getParameter(path: string): object | string[] | string | undefined {
    return _get(this.config, path);
  }

  /**
   * Returns path to Jovo config file.
   */
  getPath(): string {
    return joinPaths(this.projectPath, Config.getFileName());
  }

  /**
   * Returns the name of the Jovo config file.
   */
  static getFileName(): string {
    return 'jovo.project.js';
  }
}
