import { existsSync, mkdirSync } from 'fs';
import { join as joinPaths } from 'path';
import globalNpmModulesPath from 'global-modules';

import {
  JovoCliPlugin,
  JovoCliPluginConfig,
  JovoCliPluginEntry,
  JovoCliPluginType,
  JovoUserConfig,
} from '.';

import { Project } from './Project';
import { JovoUserConfigFile, JOVO_WEBHOOK_URL, REPO_URL } from './utils';

export class JovoCli {
  private static instance: JovoCli;
  private cliPlugins: JovoCliPlugin[] = [];

  readonly $projectPath: string;
  readonly $project?: Project;
  readonly $userConfig: JovoUserConfig;

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
   * Checks whether current working directory is a Jovo project.
   */
  isInProjectDirectory(): boolean {
    if (!existsSync(this.$projectPath + 'package.json')) {
      return false;
    }

    // ToDo: Look for jovo-framework dependency in package.json.

    return existsSync(joinPaths(this.$projectPath, 'project.js'));
  }

  collectLocalPlugins(): JovoCliPluginConfig[] {
    const localPlugins: JovoCliPluginConfig[] = [];
    if (!this.$project) {
      return localPlugins;
    }

    const projectCliPlugins: JovoCliPluginEntry[] = this.$project.getCliPlugins();

    for (const plugin of projectCliPlugins) {
      const cliPlugin: JovoCliPluginConfig = {
        name: '',
        path: '',
        options: {},
      };
      // Check plugin type.
      if (typeof plugin === 'string') {
        // Load plugin from 'node_modules/'.
        cliPlugin.name = plugin;
        cliPlugin.path = joinPaths(this.$projectPath, 'node_modules', plugin);
      } else {
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
    const pluginConfigs: JovoCliPluginConfig[] = [
      ...this.collectLocalPlugins(),
      ...this.collectGlobalPlugins(),
    ];

    for (const pluginConfig of pluginConfigs) {
      // Instantiate default class exported from plugin and pass config as parameter.
      const plugin: JovoCliPlugin = new (require(pluginConfig.path).default)(pluginConfig);

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
    return joinPaths(JOVO_WEBHOOK_URL, this.$userConfig.getWebhookUuid());
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
