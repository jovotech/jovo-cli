import { JovoTaskContext, Project } from './';
import { ListrTask } from 'listr';
export declare class JovoCliDeploy {
    static TARGET_KEY: string;
    constructor();
    execute(ctx: JovoTaskContext, project: Project): ListrTask[];
}
