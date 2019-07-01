import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import * as childProcess from 'child_process';
import * as path from 'path';
import { deleteFolderRecursive } from '../utils/Utils';
import { runJovoCommand } from './Helpers';

const testFolder = 'tmpTestFolderLoad';
const exec = childProcess.exec;

beforeEach(() => {
	deleteFolderRecursive(testFolder);
	if (!existsSync(testFolder)) {
		mkdirSync(testFolder);
	}
});

afterAll(() => {
	deleteFolderRecursive(testFolder);
});

describe('load', () => {
	it('jovo new <project> --init alexaSkill --build\n\tjovo load jovo-component-email\n\t>> Should fail if component doesn\'t exist', async () => {
		const projectName = 'jovo-cli-unit-test';

		const parameters = [
			projectName,
			'-t', 'helloworldtest',
			'--build', 'alexaSkill',
			'--skip-npminstall'
		];

		const projectFolder = path.join(testFolder, projectName);
		await runJovoCommand('new', parameters, testFolder, 'Installation completed');

		// Load component
		const res = await runJovoCommand('load', ['jovo-component-email'], projectFolder, 'The component \'jovo-component-email\' does not exist. Please check for spelling or install it with \'npm i jovo-component-email -s\'.');

		expect(res).toMatch(
			'The component \'jovo-component-email\' does not exist. ' +
			'Please check for spelling or install it with \'npm i jovo-component-email -s\'.'
		);
	}, 20000);

	it('jovo new <project> --init alexaSkill --build\n\tjovo load jovo-component-email\n\t>> Typescript Project\n\t>> Typescript Component', async () => {
		const projectName = 'jovo-cli-unit-test';

		const parameters = [
			projectName,
			'-t', 'helloworldtest',
			'--build', 'alexaSkill',
			'--skip-npminstall',
			'--language', 'typescript'
		];

		const projectFolder = path.join(testFolder, projectName);
		await runJovoCommand('new', parameters, testFolder, 'Installation completed');

		// Create fake component
		await exec('mkdir node_modules/jovo-component-email/dist/ -p', { cwd: `${testFolder}/${projectName}` });
		await exec('touch index.ts README.md package.json', { cwd: `${testFolder}/${projectName}/node_modules/jovo-component-email` });
		const packageJson = {
			devDependencies: {
				typescript: '^3.5.2'
			}
		}
		writeFileSync(`${testFolder}/${projectName}/node_modules/jovo-component-email/package.json`, JSON.stringify(packageJson));

		// Load component
		await runJovoCommand('load', ['jovo-component-email'], projectFolder, 'Successfully copied jovo-component-email into ./src/components.');

		expect(existsSync(`${projectFolder}/src/components/jovo-component-email`)).toBeTruthy();
		expect(existsSync(`${projectFolder}/src/components/jovo-component-email/dist`)).toBeFalsy();
		expect(existsSync(`${projectFolder}/src/components/jovo-component-email/index.ts`)).toBeTruthy();
	}, 20000);

	it('jovo new <project> --init alexaSkill --build\n\tjovo load jovo-component-email\n\t>> Javascript Project\n\t>> Typescript Component', async () => {
		const projectName = 'jovo-cli-unit-test';

		const parameters = [
			projectName,
			'-t', 'helloworldtest',
			'--build', 'alexaSkill',
			'--skip-npminstall'
		];

		const projectFolder = path.join(testFolder, projectName);
		await runJovoCommand('new', parameters, testFolder, 'Installation completed');

		// Create fake component
		await exec('mkdir node_modules/jovo-component-email/dist/src -p', { cwd: `${testFolder}/${projectName}` });
		await exec('mkdir node_modules/jovo-component-email/src/ -p', { cwd: `${testFolder}/${projectName}` });
		await exec('touch index.ts README.md package.json tsconfig.json src/handler.ts dist/index.js dist/src/handler.js', { cwd: `${testFolder}/${projectName}/node_modules/jovo-component-email` });
		const packageJson = {
			devDependencies: {
				typescript: '^3.5.2'
			}
		}
		writeFileSync(`${testFolder}/${projectName}/node_modules/jovo-component-email/package.json`, JSON.stringify(packageJson));

		// Load component
		await runJovoCommand('load', ['jovo-component-email'], projectFolder, 'Successfully copied jovo-component-email into ./src/components.');

		expect(existsSync(`${projectFolder}/src/components/jovo-component-email`)).toBeTruthy();
		expect(existsSync(`${projectFolder}/src/components/jovo-component-email/index.js`)).toBeTruthy();
		expect(existsSync(`${projectFolder}/src/components/jovo-component-email/src/handler.js`)).toBeTruthy();
		expect(existsSync(`${projectFolder}/src/components/jovo-component-email/dist`)).toBeFalsy();
		expect(existsSync(`${projectFolder}/src/components/jovo-component-email/src/handler.ts`)).toBeFalsy();
		expect(existsSync(`${projectFolder}/src/components/jovo-component-email/index.ts`)).toBeFalsy();
	}, 20000);

	it('jovo new <project> --init alexaSkill --build\n\tjovo load jovo-component-email\n\t>> Typescript Project\n\t>> Javascript Component', async () => {
		const projectName = 'jovo-cli-unit-test';

		const parameters = [
			projectName,
			'-t', 'helloworldtest',
			'--build', 'alexaSkill',
			'--skip-npminstall',
			'--language', 'typescript'
		];

		const projectFolder = path.join(testFolder, projectName);
		await runJovoCommand('new', parameters, testFolder, 'Installation completed');

		// Create fake component
		await exec('mkdir node_modules/jovo-component-email/ -p', { cwd: `${testFolder}/${projectName}` });
		await exec('touch index.js README.md package.json', { cwd: `${testFolder}/${projectName}/node_modules/jovo-component-email` });

		// Load component
		await runJovoCommand('load', ['jovo-component-email'], projectFolder, 'Successfully copied jovo-component-email into ./src/components.');

		expect(existsSync(`${projectFolder}/src/components/jovo-component-email`)).toBeTruthy();
		expect(existsSync(`${projectFolder}/src/components/jovo-component-email/index.js`)).toBeTruthy();
	}, 20000);

	it('jovo new <project> --init alexaSkill --build\n\tjovo load jovo-component-email\n\t>> Javascript Project\n\t>> Javascript Component', async () => {
		const projectName = 'jovo-cli-unit-test';

		const parameters = [
			projectName,
			'-t', 'helloworldtest',
			'--build', 'alexaSkill',
			'--skip-npminstall'
		];

		const projectFolder = path.join(testFolder, projectName);
		await runJovoCommand('new', parameters, testFolder, 'Installation completed');

		// Create fake component
		await exec('mkdir node_modules/jovo-component-email/dist/ -p', { cwd: `${testFolder}/${projectName}` });
		await exec('touch index.js README.md package.json dist/index.js', { cwd: `${testFolder}/${projectName}/node_modules/jovo-component-email` });

		// Load component
		await runJovoCommand('load', ['jovo-component-email'], projectFolder, 'Successfully copied jovo-component-email into ./src/components.');

		expect(existsSync(`${projectFolder}/src/components/jovo-component-email`)).toBeTruthy();
		expect(existsSync(`${projectFolder}/src/components/jovo-component-email/index.js`)).toBeTruthy();
	}, 20000);
});

