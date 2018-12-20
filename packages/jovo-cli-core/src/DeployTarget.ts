import { JovoTaskContext, Project } from './';
import { ListrTask } from 'listr';


export class JovoCliDeploy {

	static TARGET_KEY = '';

	constructor() {
	}

	execute(ctx: JovoTaskContext, project: Project): ListrTask[] {
		throw new Error('Method "execute" is not implemented');
	}
}
