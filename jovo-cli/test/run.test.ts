import { mkdirSync } from 'fs';
import * as path from 'path';
import { deleteFolderRecursive } from '../src/utils';
import { runJovoCommand } from './Helpers';

const tmpTestFolder = 'tmpTestFolderRun';

beforeAll(() => {
	deleteFolderRecursive(tmpTestFolder);
	mkdirSync(tmpTestFolder);
});

afterAll(() => {
	// deleteFolderRecursive(tmpTestfolder);
});

describe('run', () => {
	it('jovo run', async () => {
		const projectName = 'helloworldRun';
		const projectFolder = path.join(tmpTestFolder, projectName);

		// Create new project
		const parameters = [projectName, '-t', 'helloworldtest'];
		await runJovoCommand(
			'new',
			parameters,
			tmpTestFolder,
			'Installation completed.'
		);

		return await runJovoCommand(
			'run',
			[],
			projectFolder,
			'Local server listening on port 3000.'
		);
	}, 200000);

	it('jovo run --webhook-standalone', async () => {
		const projectName = 'helloworldRun-standalone';
		const projectFolder = path.join(tmpTestFolder, projectName);

		// Create new project
		const parameters = [projectName, '-t', 'helloworldtest'];
		await runJovoCommand(
			'new',
			parameters,
			tmpTestFolder,
			'Installation completed.'
		);

		return await runJovoCommand(
			'run',
			['--webhook-only'],
			projectFolder,
			'This is your webhook url:'
		);
	}, 200000);
});
