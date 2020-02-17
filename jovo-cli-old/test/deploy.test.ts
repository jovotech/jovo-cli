'use strict';

const tmpTestfolder = 'tmpTestfolderDeploy';

import 'jest';
import * as childProcess from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { deleteFolderRecursive } from '../utils/Utils';
import { runJovoCommand } from './Helpers';

const exec = childProcess.exec;

const askProfile: string = (process.env && process.env.ASK_PROFILE) as string | '';


beforeAll((done) => {
	deleteFolderRecursive(tmpTestfolder);
	if (!fs.existsSync(tmpTestfolder)) {
		fs.mkdirSync(tmpTestfolder);
	}
	done();
}, 5000);


describe('deploy v1', () => {
	it('jovo new <project> --init alexaSkill --build --v1\n      jovo deploy', async () => {
		if (!askProfile) {
			console.log('Skipping because no ask profile found');
			return;
		}

		const projectName = 'jovo-cli-unit-test_v1';

		// Create new project
		const parameters = [
			projectName,
			'-t', 'helloworldtest',
			'--init', 'alexaSkill',
			'--build',
			'--skip-npminstall',
			'--v1'];
		await runJovoCommand('new', parameters, tmpTestfolder, 'Installation completed.');

		// Deploy project
		const projectFolder = path.join(tmpTestfolder, projectName);
		await runJovoCommand('deploy', ['--ask-profile', askProfile.toString()], projectFolder, 'Deployment completed.');

		// Tests
		const askConfig = JSON.parse(
			fs.readFileSync(path.join(
				projectFolder,
				'platforms',
				'alexaSkill',
				'.ask',
				'config')).toString());
		expect(askConfig.deploy_settings.default.skill_id.length > 0)
			.toBe(true);

			await deleteSkill(askConfig.deploy_settings.default.skill_id);
	}, 200000);


	it('jovo new <project> --init alexaSkill --build --v1\n      jovo deploy --target zip', async () => {
		const projectName = 'jovo-cli-unit-test-zip_v1';

		// Create new project
		const parameters = [
			projectName,
			'-t', 'helloworldtest',
			'--init', 'alexaSkill',
			'--build',
			'--v1'];
		await runJovoCommand('new', parameters, tmpTestfolder, 'Installation completed.');

		// Deploy project
		const projectFolder = path.join(tmpTestfolder, projectName);
		await runJovoCommand('deploy', ['--target', 'zip'], projectFolder, 'Deployment completed.');

		// Tests
		const zipFilePath = path.join(projectFolder, 'bundle.zip');

		// zip should exist
		expect(fs.existsSync(zipFilePath)).toBe(true);

		// zip should not be empty
		expect(fs.statSync(zipFilePath).size).not.toBe(0);

	}, 200000);


	it('jovo new <project> --init googleAction --build --v1\n      jovo deploy', async () => {
		const projectName = 'helloworldDeployGoogleAction_v1';

		// Create new project
		const parameters = [
			projectName,
			'-t', 'helloworldtest',
			'--init', 'googleAction',
			'--build',
			'--skip-npminstall',
			'--v1'];
		await runJovoCommand('new', parameters, tmpTestfolder, 'Installation completed.');

		// Deploy project
		const projectFolder = path.join(tmpTestfolder, projectName);
		await runJovoCommand('deploy', [], projectFolder, 'Deployment completed.');

		// Tests
		const dialogflowAgentZipPath = path.join(projectFolder, 'platforms', 'googleAction', 'dialogflow_agent.zip');

		// Dialogflow agent zip should exist
		expect(fs.existsSync(dialogflowAgentZipPath)).toBe(true);

		// Dialogflow agent zip should not be empty
		expect(fs.statSync(dialogflowAgentZipPath).size).not.toBe(0);
	}, 200000);

});


describe('deploy v2', () => {
	it('jovo new <project> --build\n      jovo deploy --platform alexaSkill', async () => {
		if (!askProfile) {
			console.log('Skipping because no ask profile found');
			return;
		}

		const projectName = 'jovo-cli-unit-test_v2';

		// Create new project
		const parameters = [
			projectName,
			'-t', 'helloworldtest',
			'--build', 'alexaSkill'];
		await runJovoCommand('new', parameters, tmpTestfolder, 'Installation completed.');

		// Deploy project
		const projectFolder = path.join(tmpTestfolder, projectName);
		await runJovoCommand('deploy', ['--ask-profile', askProfile.toString(), '--platform', 'alexaSkill'], projectFolder, 'Deployment completed.');

		// Tests
		const askConfig = JSON.parse(
			fs.readFileSync(path.join(
				projectFolder,
				'platforms',
				'alexaSkill',
				'.ask',
				'config')).toString());
		expect(askConfig.deploy_settings.default.skill_id.length > 0)
			.toBe(true);

		await deleteSkill(askConfig.deploy_settings.default.skill_id);
	}, 200000);


	it('jovo new <project> --build\n      jovo deploy --target zip', async () => {
		const projectName = 'jovo-cli-unit-test-zip_v2';

		// Create new project
		const parameters = [
			projectName,
			'-t', 'helloworldtest',
			'--build', 'alexaSkill'];
		await runJovoCommand('new', parameters, tmpTestfolder, 'Installation completed.');

		// Deploy project
		const projectFolder = path.join(tmpTestfolder, projectName);
		await runJovoCommand('deploy', ['--target', 'zip'], projectFolder, 'Deployment completed.');

		// Tests
		const zipFilePath = path.join(projectFolder, 'bundle.zip');

		// zip should exist
		expect(fs.existsSync(zipFilePath)).toBe(true);

		// zip should not be empty
		expect(fs.statSync(zipFilePath).size).not.toBe(0);

	}, 200000);


	it('jovo new <project> --build\n      jovo deploy', async () => {
		const projectName = 'helloworldDeployGoogleAction_v2';

		// Create new project
		const parameters = [
			projectName,
			'-t', 'helloworldtest',
			'--build', 'googleAction'];
		await runJovoCommand('new', parameters, tmpTestfolder, 'Installation completed.');

		// Deploy project
		const projectFolder = path.join(tmpTestfolder, projectName);
		await runJovoCommand('deploy', ['--platform', 'googleAction'], projectFolder, 'Deployment completed.');

		// Tests
		const dialogflowAgentZipPath = path.join(projectFolder, 'platforms', 'googleAction', 'dialogflow_agent.zip');

		// Dialogflow agent zip should exist
		expect(fs.existsSync(dialogflowAgentZipPath)).toBe(true);

		// Dialogflow agent zip should not be empty
		expect(fs.statSync(dialogflowAgentZipPath).size).not.toBe(0);
	}, 200000);

});


afterAll((done) => {
	setTimeout(() => {
		deleteFolderRecursive(tmpTestfolder);
		done();
	}, 2000);
}, 5000);


/**
 * Deletes skill from ASK
 * @param {string} skillId
 * @param {function} callback
 */
async function deleteSkill(skillId: string) {
	return new Promise((resolve, reject) => {
		exec('ask api delete-skill --skill-id ' + skillId, {
		}, (error, stdout, stderr) => {
			if (error) {
				console.log(error);
				if (stderr) {
					console.log(stderr);
				}
				reject(error);
			}
			if (stdout.indexOf('Skill deleted successfully.') > -1) {
				resolve();
			}
		});
	});
}
