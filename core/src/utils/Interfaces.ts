import * as Parser from '@oclif/parser';
import { Input } from '@oclif/command/lib/flags';

import { JovoCliPlugin } from '../JovoCliPlugin';
import { PluginCommand } from '../PluginCommand';
import { Project } from '../Project';
import { JovoUserConfig } from '../JovoUserConfig';

// ####### EVENT EMITTER #######

export type Events = string;

export type MiddlewareCollection<T extends Events = DefaultEvents> = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [K in T]?: Array<(...v: any[]) => void>;
};

export interface InstallContext {
  command: string;
  // ToDo: Specific typing?
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  flags: Input<any>;
  args: Parser.args.Input;
}

export interface ParseContext {
  command: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  flags: CliFlags<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: CliArgs<any>;
}

export type DefaultEvents = 'install' | 'parse';

// ####### PLUGIN #######

export type PluginType = 'platform' | 'target' | 'command' | '';

export interface Files {
  [key: string]: string | Files;
}

export interface LocaleMap {
  [locale: string]: string[];
}

export interface PluginConfig {
  files?: Files;
  locales?: LocaleMap;
}

export interface ConfigHooks {
  [key: string]: Function[];
}

export interface PluginContext {
  command: string;
  platforms: string[];
  locales: string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  flags: CliFlags<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: CliArgs<any>;
}

// ####### CONFIG #######

export interface DeployConfiguration {
  target?: string[];
}

export interface ProjectConfigFile {
  deploy?: DeployConfiguration;
  endpoint?: string;
  plugins?: JovoCliPlugin[];
  hooks?: ConfigHooks;
  defaultStage?: string;
  stages?: { [key: string]: ProjectConfigFile };
}

export interface JovoUserConfigFile {
  webhook: {
    uuid: string;
  };
  cli: {
    plugins: string[];
    presets: Preset[];
  };
  timeLastUpdateMessage?: string | number;
}

export interface MarketplacePlugin {
  name: string;
  module: string;
  cliModule?: string;
  package: string;
  description: string;
  tags: string | string[];
}

export interface ProjectProperties {
  projectName: string;
  language: 'javascript' | 'typescript';
  platforms: MarketplacePlugin[];
  locales: string[];
  linter: boolean;
  unitTesting: boolean;
}

export interface Preset extends ProjectProperties {
  name: string;
}

// ####### PACKAGE MANAGEMENT #######

export interface DependencyFile {
  devDependencies?: {
    [dependency: string]: string;
  };
  dependencies?: {
    [dependency: string]: string | { version: string; dev?: boolean };
  };
}

export interface Packages {
  [key: string]: {
    version: string;
    dev: boolean;
    inPackageJson: boolean;
  };
}

export interface PackageVersions {
  [key: string]: {
    local: string;
    npm: string;
    dev: boolean;
    inPackageJson: boolean;
  };
}

// ####### CLI COMMAND #######

export type CliFlags<COMMAND extends typeof PluginCommand> = COMMAND extends Parser.Input<infer T>
  ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Parser.Output<T, any>['flags']
  : never;

export interface CommandArgument<NAME extends string> {
  name: NAME;
  parse?: Function;
  required?: boolean;
  description?: string;
  hidden?: boolean;
  default?: string;
  options?: string[];
}

export type CliArgs<COMMAND extends typeof PluginCommand> = Record<
  COMMAND['args'][number]['name'],
  string
>;

export interface JovoCli {
  $userConfig: JovoUserConfig;
  $projectPath: string;
  $project?: Project;
  /**
   * Initializes a new project at the provided path.
   * @param path - Project path.
   */
  initializeProject(path: string): void;
  /**
   * Checks whether current working directory is a Jovo project.
   */
  isInProjectDirectory(): boolean;
  collectCommandPlugins(): JovoCliPlugin[];
  loadPlugins(): JovoCliPlugin[];
  /**
   * Passes a deep copy without reference of the provided context to each CLI plugin.
   * @param context - Plugin context.
   */
  setPluginContext(context: PluginContext): void;
  /**
   * Returns an array of CLI plugin with the provided type.
   * @param type - Type of CLI plugin.
   */
  getPluginsWithType(type: PluginType): JovoCliPlugin[];
  getPlatforms(): string[];
  /**
   * Resolves a given endpoint. If the endpoint is ${JOVO_WEBHOOK_URL},
   * it will get resolved to the actual user webhook url.
   * @param endpoint - The endpoint to resolve.
   */
  resolveEndpoint(endpoint: string): string;
  /**
   * Returns the default Jovo Webhook URL.
   */
  getJovoWebhookUrl(): string;
  /**
   * Checks, if given directory already exists.
   * @param directory - Directory name.
   */
  hasExistingProject(directory: string): boolean;
}
