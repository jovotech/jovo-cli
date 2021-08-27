import _get from 'lodash.get';
import _merge from 'lodash.merge';
import _mergeWith from 'lodash.mergewith';
import { join as joinPaths } from 'path';

import { JovoCliError } from './JovoCliError';
import { JovoCliPlugin } from './JovoCliPlugin';
import { Log } from './Logger';
import { mergeArrayCustomizer } from './utilities';
import { ProjectConfigFile } from './interfaces';

export class Config {
  private static instance?: Config;
  private readonly config: ProjectConfigFile;

  constructor(private projectPath: string, private stage?: string) {
    const configContent: ProjectConfigFile = this.getContent();
    if (!stage) {
      this.stage = _get(configContent, 'defaultStage');
    }

    this.config = this.get();
    Log.verbose('Loaded project configuration');
  }

  /**
   * Returns singleton project instance.
   * @param projectPath - Current project path.
   * @param stage - Optional stage.
   */
  static getInstance(projectPath: string, stage?: string): Config {
    if (!this.instance) {
      this.instance = new Config(projectPath, stage);
    }
    return this.instance;
  }

  /**
   * Returns configuration, considering the stage. If no stage is set, just returns this.getConfigContent().
   */
  get(): ProjectConfigFile {
    const config: ProjectConfigFile = this.getContent();

    if (this.stage) {
      const stagedConfig: ProjectConfigFile | undefined = _get(config, `stages.${this.stage}`);
      if (stagedConfig) {
        _mergeWith(config, stagedConfig, mergeArrayCustomizer);

        // Merge plugins with the same constructor.
        const plugins: JovoCliPlugin[] = config.plugins || [];
        const mergedPlugins: { [constructor: string]: JovoCliPlugin } = {};

        for (const plugin of plugins) {
          if (!(plugin instanceof JovoCliPlugin)) {
            throw new JovoCliError({
              message: `Plugin ${plugin} is not an instance of JovoCliPlugin.`,
              details:
                'Make sure your plugin inherits JovoCliPlugin provided by @jovotech/cli-core',
            });
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
  getContent(): ProjectConfigFile {
    try {
      const config: ProjectConfigFile = require(this.getPath());
      return config;
    } catch (error) {
      throw new JovoCliError({
        message: 'Could not load project configuration.',
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        details: error.message,
      });
    }
  }

  /**
   * Gets the value for a provided path from the configuration.
   * @param path
   */
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
