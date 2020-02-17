const tmpTestfolder = 'tmpTestfolderNew';

import 'jest';
import * as fs from 'fs';
import * as path from 'path';
import { deleteFolderRecursive } from '../src/utils';
import { runJovoCommand } from './Helpers';

beforeAll(done => {
	deleteFolderRecursive(tmpTestfolder);
	if (!fs.existsSync(tmpTestfolder)) {
		fs.mkdirSync(tmpTestfolder);
	}
	done();
}, 5000);

describe('new', () => {
	it('jovo new <project>', async () => {
		const projectName = 'helloworld_v2';
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
		expect(fs.existsSync(path.join(projectFolder, 'project.js'))).toBe(
			true
		);
		expect(fs.existsSync(path.join(projectFolder, 'package.json'))).toBe(
			true
		);
		expect(
			JSON.parse(
				fs
					.readFileSync(path.join(projectFolder, 'package.json'))
					.toString()
			).name
		).toBe('jovo-sample-voice-app-nodejs');
		expect(fs.existsSync(path.join(projectFolder, 'src', 'app.js'))).toBe(
			true
		);
		expect(fs.existsSync(path.join(projectFolder, 'src', 'index.js'))).toBe(
			true
		);
		expect(
			fs.existsSync(path.join(projectFolder, 'src', 'config.js'))
		).toBe(true);
		expect(
			fs.existsSync(path.join(projectFolder, 'models', 'en-US.json'))
		).toBe(true);

		deleteFolderRecursive(projectFolder);
	}, 10000);

	it('jovo new helloworld --locale de-DE', async () => {
		const projectName = 'helloworlddeDE_v2';
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
			fs.existsSync(path.join(projectFolder, 'models', 'de-DE.json'))
		).toBe(true);

		deleteFolderRecursive(projectFolder);
	}, 10000);

	it('jovo new <project> --init alexaSkill', async () => {
		const projectName = 'helloworld_init_v2';
		const projectFolder = path.join(tmpTestfolder, projectName);

		// Create new project
		const parameters = [
			projectName,
			'-t',
			'helloworldtest',
			'--init',
			'alexaSkill',
			'--skip-npminstall'
		];
		await runJovoCommand(
			'new',
			parameters,
			tmpTestfolder,
			null,
			'got deprecated'
		);

		// Tests
		deleteFolderRecursive(projectFolder);
	}, 10000);

	it('jovo new <project> --init alexaSkill --build', async () => {
		const projectName = 'helloworld_initbuild_alexaSkill_v2';
		const projectFolder = path.join(tmpTestfolder, projectName);

		// Create new project
		const parameters = [
			projectName,
			'-t',
			'helloworldtest',
			'--init',
			'alexaSkill',
			'--build',
			'--skip-npminstall'
		];
		await runJovoCommand(
			'new',
			parameters,
			tmpTestfolder,
			null,
			'got deprecated'
		);

		// Tests
		deleteFolderRecursive(projectFolder);
	}, 10000);

	it('jovo new <project> --init googleAction', async () => {
		const projectName = 'helloworld_init_v2';
		const projectFolder = path.join(tmpTestfolder, projectName);

		// Create new project
		const parameters = [
			projectName,
			'-t',
			'helloworldtest',
			'--init',
			'googleAction',
			'--skip-npminstall'
		];
		await runJovoCommand(
			'new',
			parameters,
			tmpTestfolder,
			null,
			'got deprecated'
		);

		// Tests
		deleteFolderRecursive(projectFolder);
	}, 10000);
});

afterAll(done => {
	setTimeout(() => {
		deleteFolderRecursive(tmpTestfolder);
		done();
	}, 2000);
}, 5000);
