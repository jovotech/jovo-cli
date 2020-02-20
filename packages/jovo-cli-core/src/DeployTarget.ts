import { JovoTaskContext, Project } from './';
import { ListrTask } from 'listr';

export class JovoCliDeploy {
  static TARGET_KEY = '';
  static PRE_DEPLOY_TASKS: string[] = [];

  constructor() {}

  execute(ctx: JovoTaskContext, project: Project): ListrTask[] {
    throw new Error('Method "execute" is not implemented');
  }

  getPreDeployTasks(): string[] {
    // @ts-ignore
    return this.constructor.PRE_DEPLOY_TASKS;
  }
}
