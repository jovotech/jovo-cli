import { config } from 'dotenv';
import prompt from 'prompts';
import chalk from 'chalk';
import which from 'which';

// Load .env variables into process.env
config();

export * from './ProjectConfig';
export * from './constants';
export * from './EventEmitter';
export * from './interfaces';
export * from './JovoCli';
export * from './JovoCliError';
export * from './JovoCliPlugin';
export * from './UserConfig';
export * from './Logger';
export * from './ProjectConfig';
export * from './PluginCommand';
export * from './PluginHook';
export * from './prints';
export * from './Project';
export * from './prompts';
export * from './Task';
export * from './decorators';
export * from './utilities';
export * from './validators';

export { chalk, prompt, which };
export { flags } from '@oclif/command';
export * from '@jovotech/common';

declare module '@oclif/parser/lib/args' {
  interface IArg {
    multiple?: boolean;
  }
}
