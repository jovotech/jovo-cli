'use strict';

const tmpTestfolder = 'tmpTestfolderInit';

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

describe('init', () => {
	it('jovo new <project>\n      jovo init alexaSkill', async () => {
		const projectName = 'helloworld_v2';

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

		// Build project
		const projectFolder = path.join(tmpTestfolder, projectName);

		// Tests
		try {
			await runJovoCommand(
				'init',
				['alexaSkill', '--build'],
				projectFolder,
				'Initialization completed.'
			);
		} catch (e) {
			expect(e.message).toContain('got deprecated');
			return;
		}

		// Should not reach this code
		expect(true).toBe(false);
	}, 12000);
});

afterAll(done => {
	setTimeout(() => {
		deleteFolderRecursive(tmpTestfolder);
		done();
	}, 2000);
}, 5000);
