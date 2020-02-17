import * as fs from 'fs';
import * as path from 'path';
import { deleteFolderRecursive } from '../utils/Utils';
import { runJovoCommand } from './Helpers';

const tmpTestfolder = 'tmpTestfolderRun';


describe('run v1', () => {
	const projectName = 'helloworldRun_v1';
	const projectFolder = path.join(tmpTestfolder, projectName);

	beforeAll(async () => {
		deleteFolderRecursive(tmpTestfolder);
		if (!fs.existsSync(tmpTestfolder)) {
			fs.mkdirSync(tmpTestfolder);
		}

		// Create new project
		const parameters = [
			projectName,
			'-t', 'helloworldtest',
			'--v1'];
		return await runJovoCommand('new', parameters, tmpTestfolder, 'Installation completed.');
	}, 60000);


	it('jovo run', async () => {
		return await runJovoCommand('run', [], projectFolder, 'Example server listening on port 3000!');
	}, 200000);

	it('jovo run --bst-proxy', async () => {
		return await runJovoCommand('run', ['--bst-proxy'], projectFolder, [
			'Example server listening on port 3000!',
			'info: CONFIG      No configuration. Creating one',
		]);
	}, 200000);

	it('jovo run --webhook-standalone', async () => {
		return await runJovoCommand('run', ['--webhook-standalone'], projectFolder, 'Example server listening on port 3000!');
	}, 200000);

});



describe('run v2', () => {
	const projectName = 'helloworldRun_v2';
	const projectFolder = path.join(tmpTestfolder, projectName);

	beforeAll(async () => {
		deleteFolderRecursive(tmpTestfolder);
		if (!fs.existsSync(tmpTestfolder)) {
			fs.mkdirSync(tmpTestfolder);
		}

		// Create new project
		const parameters = [
			projectName,
			'-t', 'helloworldtest'];
		return await runJovoCommand('new', parameters, tmpTestfolder, 'Installation completed.');
	}, 60000);


	it('jovo run', async () => {
		return await runJovoCommand('run', [], projectFolder, 'Local server listening on port 3000.');
	}, 200000);


	it('jovo run --bst-proxy', async () => {
		return await runJovoCommand('run', ['--bst-proxy'], projectFolder, [
			'Local server listening on port 3000.',
			'info: CONFIG      No configuration. Creating one',
		]);
	}, 200000);


	it('jovo run --webhook-standalone', async () => {
		return await runJovoCommand('run', ['--webhook-standalone'], projectFolder, 'Local server listening on port 3000.');
	}, 200000);

});


afterAll((done) => {
	setTimeout(() => {
        deleteFolderRecursive(tmpTestfolder);
        done();
    }, 2000);
}, 5000);
