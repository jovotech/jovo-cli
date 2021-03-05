import { existsSync } from 'fs';
import { join as joinPaths } from 'path';
import globalNpmModulesPath from 'global-modules';
import _merge from 'lodash.merge';

import { JovoCliPlugin } from './JovoCliPlugin';
import { Project } from './Project';
import { JOVO_WEBHOOK_URL } from './utils/Constants';
import {
  JovoCliPluginConfig,
  JovoCliPluginEntry,
  JovoCliPluginType,
  JovoUserConfigFile,
} from './utils/Interfaces';
import { URL } from 'url';
import { JovoCliError } from './JovoCliError';
import { JovoUserConfig } from './JovoUserConfig';

export class JovoCli {
  private static instance: JovoCli;
  private cliPlugins: JovoCliPlugin[] = [];

  readonly $userConfig: JovoUserConfig;

  $projectPath: string;
  $project?: Project;

  constructor() {
    this.$projectPath = process.cwd();
    this.$userConfig = new JovoUserConfig();

    if (this.isInProjectDirectory()) {
      this.$project = Project.getInstance(this.$projectPath);
    }
  }

  static getInstance(): JovoCli {
    if (!this.instance) {
      this.instance = new JovoCli();
    }

    return this.instance;
  }

  /**
   * Initializes a new project at the provided path.
   * @param path - Project path.
   */
  initializeProject(path: string) {
    this.$projectPath = path;

    if (this.isInProjectDirectory()) {
      this.$project = Project.getInstance(this.$projectPath);
    }
  }

  /**
   * Checks whether current working directory is a Jovo project.
   */
  isInProjectDirectory(): boolean {
    if (!existsSync(joinPaths(this.$projectPath, 'package.json'))) {
      return false;
    }

    // const packageJson

    // ToDo: Look for jovo-framework dependency in package.json.

    return existsSync(joinPaths(this.$projectPath, 'project.js'));
  }

  collectLocalPlugins(): Array<JovoCliPluginConfig | JovoCliPlugin> {
    const localPlugins: Array<JovoCliPluginConfig | JovoCliPlugin> = [];
    if (!this.$project) {
      return localPlugins;
    }

    const projectCliPlugins: JovoCliPluginEntry[] = this.$project.getCliPlugins();

    for (const plugin of projectCliPlugins) {
      const cliPlugin: JovoCliPluginConfig = {
        name: '',
        path: '',
        options: {},
        pluginId: '',
        pluginType: '',
      };
      // Check plugin type.
      if (typeof plugin === 'string') {
        // Load plugin from 'node_modules/'.
        cliPlugin.name = plugin;
        cliPlugin.path = joinPaths(this.$projectPath, 'node_modules', plugin);
      } else if (plugin instanceof JovoCliPlugin) {
        localPlugins.push(plugin);
        continue;
      } else {
        if (!plugin.name) {
          throw new JovoCliError('Could not find plugin name.', 'jovo-cli-core');
        }
        cliPlugin.name = plugin.name;
        cliPlugin.path = joinPaths(this.$projectPath, 'node_modules', plugin.name);
        cliPlugin.options = plugin.options;
      }

      // If the plugin path does not exist, skip it quietly.
      if (!existsSync(cliPlugin.path)) {
        continue;
      }

      localPlugins.push(cliPlugin);
    }
    return localPlugins;
  }

  collectGlobalPlugins(): JovoCliPluginConfig[] {
    const globalPlugins: JovoCliPluginConfig[] = [];

    const config: JovoUserConfigFile = this.$userConfig.get();

    for (const plugin of config.cli?.plugins || []) {
      const cliPlugin: JovoCliPluginConfig = {
        name: plugin as string,
        // Load plugin from global 'node_modules/'.
        path: joinPaths(globalNpmModulesPath, plugin as string),
        options: {},
        pluginId: '',
        pluginType: '',
      };

      // If the plugin does not exist, skip it quietly.
      if (!existsSync(cliPlugin.path)) {
        continue;
      }

      // Get config from project.js.
      if (this.$project) {
        const projectPlugins: JovoCliPluginEntry[] = this.$project.getCliPlugins();
        const projectPlugin: JovoCliPluginConfig = projectPlugins.find(
          (el) => typeof el === 'object' && el.name === (plugin as string),
        ) as JovoCliPluginConfig;

        if (projectPlugin) {
          cliPlugin.options = projectPlugin.options;
        }
      }

      globalPlugins.push(cliPlugin);
    }

    return globalPlugins;
  }

  /**
   * Loads both local and global plugins and returns respective classes.
   */
  loadPlugins(): JovoCliPlugin[] {
    const pluginConfigs: Array<JovoCliPluginConfig | JovoCliPlugin> = [
      ...this.collectGlobalPlugins(),
      ...this.collectLocalPlugins(),
    ];

    for (const pluginConfig of pluginConfigs) {
      // Instantiate default class exported from plugin and pass config as parameter.
      const plugin: JovoCliPlugin =
        pluginConfig instanceof JovoCliPlugin
          ? pluginConfig
          : new (require(pluginConfig.path).default)(pluginConfig);

      // Merge existing plugin config with plugin-specific values.
      _merge(plugin.config, { pluginId: plugin.id, pluginType: plugin.type });
      // Register plugin.
      this.cliPlugins.push(plugin);
    }

    return this.cliPlugins;
  }

  getPluginsWithType(type: JovoCliPluginType): JovoCliPlugin[] {
    return this.cliPlugins.filter((el) => el.type === type);
  }

  getPlatforms(): string[] {
    return this.getPluginsWithType('platform').map((el: JovoCliPlugin) => el.id);
  }

  /**
   * Resolves a given endpoint. If the endpoint is ${JOVO_WEBHOOK_URL},
   * it will get resolved to the actual user webhook url.
   * @param endpoint - The endpoint to resolve.
   */
  resolveEndpoint(endpoint: string): string {
    if (endpoint === '${JOVO_WEBHOOK_URL}') {
      return this.getJovoWebhookUrl();
    }
    return endpoint;
  }

  /**
   * Returns the default Jovo Webhook URL.
   */
  getJovoWebhookUrl(): string {
    const { href } = new URL(this.$userConfig.getWebhookUuid(), JOVO_WEBHOOK_URL);
    return href;
  }

  // ####### PROJECT CREATION #######

  /**
   * Checks, if given directory already exists.
   * @param directory - Directory name.
   */
  hasExistingProject(directory: string): boolean {
    return existsSync(joinPaths(process.cwd(), directory));
  }
}
