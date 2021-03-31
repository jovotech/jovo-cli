import { args as Args } from '@oclif/parser';
import { Input } from '@oclif/command/lib/flags';
import { JovoConfig } from 'jovo-config';
import { JovoCliPlugin } from '../JovoCliPlugin';

// ####### EVENT EMITTER #######

export type Events = {
  [key in string | symbol]: any;
};

export type ActionSet<T extends Events = DefaultEvents> = {
  [K in keyof T]?: Array<(v: T[K]) => void>;
};

export interface InstallEventArguments {
  command: string;
  flags: Input<any>;
  args: Args.Input;
}

export interface ParseEventArguments {
  command: string;
  flags: { [key: string]: string | boolean | string[] };
  args: { [key: string]: string };
}

export interface DefaultEvents {
  install: InstallEventArguments;
  parse: ParseEventArguments;
}

// ####### PLUGIN #######

export type JovoCliPluginType = 'platform' | 'target' | 'command' | '';

export interface JovoCliPluginConfig {
  pluginId?: string;
  pluginName?: string;
  pluginType?: JovoCliPluginType;
  hooks?: JovoCliConfigHooks;
  files?: any;
}

export interface JovoCliConfigHooks {
  [key: string]: Function[];
}

export interface JovoCliPluginContext {
  command: string;
  platforms: string[];
  locales: string[];
  flags: { [key: string]: string | boolean | string[] };
  args: { [key: string]: string };
}

// ####### CONFIG #######

export interface DeployConfiguration {
  target?: string[];
}

export interface ProjectConfigFile extends JovoConfig {
  deploy?: DeployConfiguration;
  endpoint?: string;
  plugins?: JovoCliPlugin[];
  hooks?: { [key: string]: Function };
  defaultStage?: string;
  stages?: { [key: string]: ProjectConfigFile };
}

export interface JovoUserConfigFile {
  webhook: {
    uuid: string;
  };
  cli: {
    plugins: string[];
    presets: JovoCliPreset[];
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

export interface JovoCliPreset extends ProjectProperties {
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
