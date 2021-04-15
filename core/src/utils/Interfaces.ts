import * as Parser from '@oclif/parser';
import { Input } from '@oclif/command/lib/flags';
import { JovoConfig } from 'jovo-config';
import { JovoCliPlugin } from '../JovoCliPlugin';
import { PluginCommand } from '../PluginCommand';

export type TypeFromArray<T extends unknown[]> = T[number];

// ####### EVENT EMITTER #######

export type Events = string;

export type ActionSet<T extends Events = DefaultEvents> = {
  [K in T]?: Array<(...v: unknown[]) => void>;
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

export interface PluginConfig {
  files?: Files;
  locales?: { [locale: string]: string[] };
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

export interface ProjectConfigFile extends JovoConfig {
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
  npmPackage: string;
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

export interface PackageVersions {
  [key: string]: {
    dev: boolean;
    inPackageJson: boolean;
    version: string;
  };
}

export interface PackageVersionsNpm {
  [key: string]: {
    local: string;
    dev: boolean;
    npm: string;
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
  TypeFromArray<COMMAND['args']>['name'],
  string
>;
