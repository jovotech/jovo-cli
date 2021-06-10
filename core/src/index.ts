import prompt from 'prompts';
import { config } from 'dotenv';
import { ProjectConfigFile } from './interfaces';

// Load .env variables into process.env
config();

export { flags } from '@oclif/command';
export { prompt };

export * from './Logger';
export * from './JovoCli';
export * from './EventEmitter';
export * from './PluginHook';
export * from './PluginCommand';
export * from './Task';
export * from './Project';
export * from './JovoCliPlugin';
export * from './JovoCliError';
export * from './JovoUserConfig';
export * from './Config';
export * from './utilities';
export * from './interfaces';
export * from './validators';
export * from './prompts';
export * from './constants';
export * from './prints';

export class ProjectConfig {
  constructor(config: ProjectConfigFile) {
    Object.assign(this, config);
  }
}
