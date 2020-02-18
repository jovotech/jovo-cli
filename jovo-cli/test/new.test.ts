import { existsSync, mkdirSync, readFileSync } from 'fs';
import * as path from 'path';
import { deleteFolderRecursive } from '../src/utils';
import { runJovoCommand } from './Helpers';

const tmpTestfolder = 'tmpTestFolderNew';

beforeAll(() => {
	deleteFolderRecursive(tmpTestfolder);
	mkdirSync(tmpTestfolder);
});

afterAll(() => {
	deleteFolderRecursive(tmpTestfolder);
});

describe('new', () => {
	it('jovo new <project>', async () => {
		const projectName = 'helloworld';
		const projectFolder = path.join(tmpTestfolder, projectName);

		// Create new project
		const parameters = [
			projectName,
			'-t',
			'helloworldtest',
			'--skip-npminstall'
		];
		await runJovoCommand(
			'new',
			parameters,
			tmpTestfolder,
			'Installation completed.'
		);

		// Tests
		expect(existsSync(path.join(projectFolder, 'project.js'))).toBe(true);
		expect(existsSync(path.join(projectFolder, 'package.json'))).toBe(true);
		expect(
			JSON.parse(
				readFileSync(path.join(projectFolder, 'package.json'), 'utf-8')
			).name
		).toBe('jovo-sample-voice-app-nodejs');
		expect(existsSync(path.join(projectFolder, 'src', 'app.js'))).toBe(
			true
		);
		expect(existsSync(path.join(projectFolder, 'src', 'index.js'))).toBe(
			true
		);
		expect(existsSync(path.join(projectFolder, 'src', 'config.js'))).toBe(
			true
		);
		expect(
			existsSync(path.join(projectFolder, 'models', 'en-US.json'))
		).toBe(true);
	}, 10000);

	it('jovo new helloworld --locale de-DE', async () => {
		const projectName = 'helloworlddeDE';
		const projectFolder = path.join(tmpTestfolder, projectName);

		// Create new project
		const parameters = [
			projectName,
			'-t',
			'helloworldtest',
			'--locale',
			'de-DE',
			'--skip-npminstall'
		];
		await runJovoCommand(
			'new',
			parameters,
			tmpTestfolder,
			'Installation completed.'
		);

		// Tests
		expect(
			existsSync(path.join(projectFolder, 'models', 'de-DE.json'))
		).toBe(true);
	}, 10000);
});
