import { PlainObjectType } from '@jovotech/common';
import _get from 'lodash.get';
import _merge from 'lodash.merge';
import _mergeWith from 'lodash.mergewith';
import { join as joinPaths } from 'path';
import { ConfigHooks } from './interfaces';
import { JovoCliError } from './JovoCliError';
import { JovoCliPlugin } from './JovoCliPlugin';
import { Log } from './Logger';
import { mergeArrayCustomizer } from './utilities';

export class ProjectConfig {
  endpoint?: string;
  plugins?: JovoCliPlugin[];
  hooks?: ConfigHooks;
  models?: {
    enabled?: boolean;
    directory?: string;
    override?: Record<string, unknown>;
  };
  defaultStage?: string;
  stages?: { [key: string]: ProjectConfig };

  private static instance?: ProjectConfig;

  constructor(config: PlainObjectType<ProjectConfig>);
  constructor(projectPath: string, stage?: string);
  constructor(configOrPath: PlainObjectType<ProjectConfig> | string, stage?: string) {
    if (typeof configOrPath === 'object') {
      Object.assign(this, configOrPath);
    } else {
      const configContent: ProjectConfig = this.loadContent(configOrPath);

      if (!stage) {
        stage = _get(configContent, 'defaultStage');
      }

      Object.assign(this, this.load(configOrPath, stage));
    }

    Log.verbose('Loaded project configuration');
  }

  /**
   * Returns singleton project instance.
   * @param projectPath - Current project path.
   * @param stage - Optional stage.
   */
  static getInstance(projectPath: string, stage?: string): ProjectConfig {
    if (!this.instance) {
      this.instance = new ProjectConfig(projectPath, stage);
    }

    return this.instance;
  }

  /**
   * Returns configuration, considering the stage. If no stage is set, just returns this.getConfigContent().
   */
  private load(projectPath: string, stage?: string): ProjectConfig {
    const configContent: ProjectConfig = this.loadContent(projectPath);

    if (stage) {
      const stagedConfig: ProjectConfig | undefined = _get(configContent, `stages.${stage}`);

      if (stagedConfig) {
        _mergeWith(configContent, stagedConfig, mergeArrayCustomizer);

        // Merge plugins with the same constructor.
        const plugins: JovoCliPlugin[] = configContent.plugins || [];
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
        configContent.plugins = Object.values(mergedPlugins);
        delete configContent.stages;
      } else {
        Log.warning(
          `Stage ${stage} could not be found in your project configuration. Taking default configuration...`,
        );
      }
    }

    return configContent;
  }

  /**
   * Reads and returns the content of the project's config file.
   */
  private loadContent(projectPath: string): ProjectConfig {
    try {
      const path: string = joinPaths(projectPath, ProjectConfig.getFileName());
      const config: ProjectConfig = require(path);
      return config;
    } catch (error) {
      throw new JovoCliError({
        message: 'Could not load project configuration.',
        details: error.message,
      });
    }
  }

  /**
   * Gets the value for a provided path from the configuration.
   * @param path
   */
  getParameter(path: string): unknown | undefined {
    return _get(this, path);
  }

  /**
   * Returns the name of the Jovo config file.
   */
  static getFileName(version: 'v4' | 'v3' = 'v4'): string {
    return version === 'v4' ? 'jovo.project.js' : 'project.js';
  }
}
