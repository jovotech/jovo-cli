import { existsSync } from 'fs';
import { join as joinPaths } from 'path';
import _get from 'lodash.get';
import { URL } from 'url';
import { npm } from 'global-dirs';
import {
  JovoCliPlugin,
  JovoUserConfig,
  Project,
  JovoCliError,
  Config,
  PluginContext,
  PluginType,
  JOVO_WEBHOOK_URL,
} from '.';

export class JovoCli {
  private static instance?: JovoCli;
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
  initializeProject(path: string): void {
    this.$projectPath = path;

    if (this.isInProjectDirectory()) {
      this.$project = Project.getInstance(this.$projectPath);
    } else {
      throw new JovoCliError(
        `Project could not be instantiated for ${this.$projectPath}`,
        'JovoCliCore',
      );
    }
  }

  /**
   * Checks whether current working directory is a Jovo project.
   */
  isInProjectDirectory(): boolean {
    const packageJsonPath: string = joinPaths(this.$projectPath, 'package.json');
    if (!existsSync(packageJsonPath)) {
      return false;
    }

    const packageJson = require(packageJsonPath);
    if (!_get(packageJson, 'dependencies["@jovotech/framework"]')) {
      return false;
    }

    return existsSync(joinPaths(this.$projectPath, Config.getFileName()));
  }

  collectCommandPlugins(): JovoCliPlugin[] {
    const globalPlugins: JovoCliPlugin[] = [];

    const plugins: string[] = (this.$userConfig.getParameter('cli.plugins') as string[]) || [];

    for (const pluginId of plugins) {
      // Load plugin from global 'node_modules/'.
      const pluginPath: string = joinPaths(npm.packages, pluginId, 'dist', 'index.js');

      // If the plugin does not exist, skip it quietly.
      if (!existsSync(pluginPath)) {
        continue;
      }

      const plugin: JovoCliPlugin = new (require(pluginPath).default)();

      globalPlugins.push(plugin);
    }

    return globalPlugins;
  }

  /**
   * Loads both project plugins and command plugins and returns respective classes.
   */
  loadPlugins(): JovoCliPlugin[] {
    this.cliPlugins.push(...this.collectCommandPlugins());

    if (this.$project) {
      this.cliPlugins.push(...this.$project.collectPlugins());
    }

    return this.cliPlugins;
  }

  /**
   * Passes a deep copy without reference of the provided context to each CLI plugin.
   * @param context - Plugin context.
   */
  setPluginContext(context: PluginContext): void {
    for (const plugin of this.cliPlugins) {
      plugin.setPluginContext(Object.assign({}, context));
    }
  }

  /**
   * Returns an array of CLI plugin with the provided type.
   * @param type - Type of CLI plugin.
   */
  getPluginsWithType(type: PluginType): JovoCliPlugin[] {
    return this.cliPlugins.filter((plugin) => plugin.$type === type);
  }

  getPlatforms(): string[] {
    return this.getPluginsWithType('platform').map((el: JovoCliPlugin) => el.$id);
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

  /**
   * Checks, if given directory already exists.
   * @param directory - Directory name.
   */
  hasExistingProject(directory: string): boolean {
    return existsSync(joinPaths(process.cwd(), directory));
  }
}
