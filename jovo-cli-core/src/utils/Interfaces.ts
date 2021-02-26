import { args as Args } from '@oclif/parser';
import { Input } from '@oclif/command/lib/flags';
import { JovoConfig } from 'jovo-config';

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
  name: string;
  path: string;
  options: JovoCliPluginOptions;
  pluginId: string;
  pluginType: JovoCliPluginType;
}

export interface JovoCliConfigHooks {
  [key: string]: Function;
}

export interface JovoCliPluginOptions {
  hooks?: JovoCliConfigHooks;
  files?: any;
  [key: string]: any;
}

export type JovoCliPluginEntry = string | JovoCliPluginConfig;

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

export interface ProjectConfig extends JovoConfig {
  // ToDo: What do we really need?
  deploy?: DeployConfiguration;
  endpoint?: string;
}

export interface JovoUserConfigFile {
  webhook: {
    uuid: string;
  };
  cli: {
    plugins: JovoCliPluginEntry[];
    presets: JovoCliPreset[];
  };
  timeLastUpdateMessage?: string | number;
}

export interface ProjectProperties {
  projectName: string;
  template: string;
  language: 'javascript' | 'typescript';
  platforms: string[];
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
