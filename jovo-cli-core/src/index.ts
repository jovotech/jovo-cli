import prompt from 'prompts';
import { ProjectConfigObject } from './utils';

export { flags } from '@oclif/command';
export { prompt };

export * from './EventEmitter';
export * from './PluginHook';
export * from './utils';
export * from './PluginCommand';
export * from './Task';
export * from './Project';
export * from './JovoCliPlugin';
export * from './JovoCliError';
export * from './JovoUserConfig';
export * from './Config';
export * from './JovoCli';

export class ProjectConfig {
  constructor(config: ProjectConfigObject) {
    Object.assign(this, config);
  }
}
