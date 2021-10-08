import * as Parser from '@oclif/parser';
import { Input } from '@oclif/command/lib/flags';

import { JovoCliPlugin } from './JovoCliPlugin';
import { PluginCommand } from './PluginCommand';

// ####### EVENT EMITTER #######

export type Events = string;

export type MiddlewareCollection<T extends Events = DefaultEvents> = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [K in T]?: Array<(...v: any[]) => void>;
};

export type DefaultEvents = 'install';

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: ((context: PluginContext) => any)[];
}

export interface Context {
  command: string;
}

export interface InstallContext extends Context {
  // TODO: Specific typing?
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  flags: Input<any>;
  args: Parser.args.Input;
}

export interface PluginContext extends Context {}

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

export type CliArgs<COMMAND extends typeof PluginCommand> = Record<
  COMMAND['args'][number]['name'],
  COMMAND['args'][number]['multiple'] extends true ? string[] : string
>;

// ####### UTILITIES #######

export interface ExecResponse {
  stderr?: string;
  stdout?: string;
}
