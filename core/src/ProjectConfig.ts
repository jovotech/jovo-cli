import { ConfigHooks, JovoCliPlugin } from '.';

export class ProjectConfig {
  endpoint?: string;
  plugins?: JovoCliPlugin[];
  hooks?: ConfigHooks;
  defaultStage?: string;
  stages?: { [key: string]: ProjectConfig };

  constructor(config: ProjectConfig) {
    Object.assign(this, config);
  }
}
