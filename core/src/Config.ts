import _get from 'lodash.get';
import _merge from 'lodash.merge';
import _mergeWith from 'lodash.mergewith';
import { join as joinPaths } from 'path';
import { JovoCliError } from './JovoCliError';
import { JovoCliPlugin } from './JovoCliPlugin';
import { Log } from './Logger';
import { ProjectConfig } from './ProjectConfig';
import { mergeArrayCustomizer } from './utilities';

export class Config {
  private static instance?: Config;
  private readonly config: ProjectConfig;

  constructor(private projectPath: string, private stage?: string) {
    const configContent: ProjectConfig = this.getContent();
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
  get(): ProjectConfig {
    const config: ProjectConfig = this.getContent();

    if (this.stage) {
      const stagedConfig: ProjectConfig | undefined = _get(config, `stages.${this.stage}`);
      if (stagedConfig) {
        _mergeWith(config, stagedConfig, mergeArrayCustomizer);

        // Merge plugins with the same constructor.
        const plugins: JovoCliPlugin[] = config.plugins || [];
        const mergedPlugins: { [constructor: string]: JovoCliPlugin } = {};

        for (const plugin of plugins) {
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
  getContent(): ProjectConfig {
    try {
      const config: ProjectConfig = require(this.getPath());
      return config;
    } catch (error) {
      throw new JovoCliError({
        message: 'Could not load project configuration.',
        details: (error as Error).message,
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
