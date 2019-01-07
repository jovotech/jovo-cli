const tmpTestfolder = 'tmpTestfolderNew';

import 'jest';
import * as childProcess from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { deleteFolderRecursive } from '../utils/Utils';
import { runJovoCommand } from './Helpers';

const spawn = childProcess.spawn;

beforeAll((done) => {
	deleteFolderRecursive(tmpTestfolder);
	if (!fs.existsSync(tmpTestfolder)) {
		fs.mkdirSync(tmpTestfolder);
	}
	done();
}, 5000);


describe('new v1', () => {
	it('jovo new <project> --v1', async () => {
		const projectName = 'helloworld_v1';
		const projectFolder = path.join(tmpTestfolder, projectName);

		// Create new project
		const parameters = [
			projectName,
			'-t', 'helloworldtest',
			'--skip-npminstall',
			'--v1'];
		await runJovoCommand('new', parameters, tmpTestfolder, 'Installation completed.');

		// Tests
		expect(fs.existsSync(path.join(projectFolder, 'index.js'))).toBe(true);
		expect(fs.existsSync(path.join(projectFolder, 'package.json'))).toBe(true);
		expect(JSON.parse(fs.readFileSync(path.join(projectFolder, 'package.json')).toString()).name).toBe('jovo-sample-voice-app-nodejs');
		expect(fs.existsSync(path.join(projectFolder, 'app', 'app.js'))).toBe(true);
		expect(fs.existsSync(path.join(projectFolder, 'models', 'en-US.json'))).toBe(true);

		deleteFolderRecursive(projectFolder);
	}, 10000);

	it('jovo new helloworld --locale de-DE --v1', async () => {
		const projectName = 'helloworlddeDE_v1';
		const projectFolder = path.join(tmpTestfolder, projectName);

		// Create new project
		const parameters = [
			projectName,
			'-t', 'helloworldtest',
			'--locale', 'de-DE',
			'--skip-npminstall',
			'--v1'];
		await runJovoCommand('new', parameters, tmpTestfolder, 'Installation completed.');

		// Tests
		expect(fs.existsSync(path.join(projectFolder, 'models', 'de-DE.json'))).toBe(true);

		deleteFolderRecursive(projectFolder);
	}, 10000);

	it('jovo new <project> --init alexaSkill --v1', async () => {
		const projectName = 'helloworld_init_alexaSkill_v1';
		const projectFolder = path.join(tmpTestfolder, projectName);

		// Create new project
		const parameters = [
			projectName,
			'-t', 'helloworldtest',
			'--init', 'alexaSkill',
			'--skip-npminstall',
			'--v1'];
		await runJovoCommand('new', parameters, tmpTestfolder, 'Installation completed.');

		// Tests
		expect(fs.existsSync(path.join(projectFolder, 'app.json'))).toBe(true);
		const appJson = JSON.parse(fs.readFileSync(path.join(projectFolder, 'app.json')).toString());
		expect(appJson.alexaSkill.nlu.name)
			.toBe('alexa');
		expect(appJson.endpoint.substr(0, 27))
			.toBe('https://webhook.jovo.cloud/');
		deleteFolderRecursive(projectFolder);
	}, 10000);

	it('jovo new <project> --init alexaSkill --build --v1', async () => {
		const projectName = 'helloworld_initbuild_alexaSkill_v1';
		const projectFolder = path.join(tmpTestfolder, projectName);

		// Create new project
		const parameters = [
			projectName,
			'-t', 'helloworldtest',
			'--init', 'alexaSkill',
			'--build',
			'--skip-npminstall',
			'--v1'];
		await runJovoCommand('new', parameters, tmpTestfolder, 'Installation completed.');

		// Tests
		expect(fs.existsSync(path.join(projectFolder, 'platforms')))
			.toBe(true);

		expect(fs.existsSync(path.join(projectFolder, 'platforms', 'alexaSkill')))
			.toBe(true);

		expect(fs.existsSync(path.join(projectFolder, 'platforms', 'alexaSkill', 'skill.json')))
			.toBe(true);
		const skillJson = JSON.parse(fs.readFileSync(path.join(projectFolder, 'platforms', 'alexaSkill', 'skill.json')).toString());

		expect(skillJson.manifest.publishingInformation.locales['en-US'].name)
			.toBe(projectName);
		expect(skillJson.manifest.apis.custom.endpoint.uri.substr(0, 27))
			.toBe('https://webhook.jovo.cloud/');

		expect(fs.existsSync(path.join(projectFolder, 'platforms', 'alexaSkill', 'models', 'en-US.json')))
			.toBe(true);
		const modelFile = JSON.parse(
			fs.readFileSync(path.join(projectFolder, 'platforms', 'alexaSkill', 'models', 'en-US.json')).toString());

		expect(modelFile.interactionModel.languageModel.invocationName)
			.toBe('my test app');
		deleteFolderRecursive(projectFolder);
	}, 10000);

	it('jovo new <project> --init alexaSkill --build --locale de-DE --v1', async () => {
		const projectName = 'helloworld_initbuilddeDE_v1';
		const projectFolder = path.join(tmpTestfolder, projectName);

		// Create new project
		const parameters = [
			projectName,
			'-t', 'helloworldtest',
			'--init', 'alexaSkill',
			'--locale', 'de-DE',
			'--build',
			'--skip-npminstall',
			'--v1'];
		await runJovoCommand('new', parameters, tmpTestfolder, 'Installation completed.');

		// Tests
		expect(fs.existsSync(path.join(projectFolder, 'platforms')))
			.toBe(true);
		expect(fs.existsSync(path.join(projectFolder, 'platforms', 'alexaSkill')))
			.toBe(true);
		expect(fs.existsSync(path.join(projectFolder, 'platforms', 'alexaSkill', 'skill.json')))
			.toBe(true);
		const skillJson = JSON.parse(fs.readFileSync(path.join(projectFolder, 'platforms', 'alexaSkill', 'skill.json')).toString());

		expect(skillJson.manifest.publishingInformation.locales['de-DE'].name)
			.toBe(projectName);
		expect(skillJson.manifest.apis.custom.endpoint.uri.substr(0, 27))
			.toBe('https://webhook.jovo.cloud/');

		expect(fs.existsSync(path.join(projectFolder, 'platforms', 'alexaSkill', 'models', 'de-DE.json')))
			.toBe(true);
		const modelFile = JSON.parse(
			fs.readFileSync(path.join(projectFolder, 'platforms', 'alexaSkill', 'models', 'de-DE.json')).toString());

		expect(modelFile.interactionModel.languageModel.invocationName)
			.toBe('my test app');
		deleteFolderRecursive(projectFolder);
	}, 10000);

	it('jovo new <project> --init googleAction --v1', async () => {
		const projectName = 'helloworld_init_googleAction_v1';
		const projectFolder = path.join(tmpTestfolder, projectName);

		// Create new project
		const parameters = [
			projectName,
			'-t', 'helloworldtest',
			'--init', 'googleAction',
			'--skip-npminstall',
			'--v1'];
		await runJovoCommand('new', parameters, tmpTestfolder, 'Installation completed.');

		// Tests
		expect(fs.existsSync(path.join(projectFolder, 'app.json'))).toBe(true);
		const appJson = JSON.parse(fs.readFileSync(path.join(projectFolder, 'app.json')).toString());
		expect(appJson.googleAction.nlu.name)
			.toBe('dialogflow');
		expect(appJson.endpoint.substr(0, 27))
			.toBe('https://webhook.jovo.cloud/');
		deleteFolderRecursive(projectFolder);
	}, 10000);

	it('jovo new <project> --init googleAction --build --v1', async () => {
		const projectName = 'helloworld_initbuild_googleAction_v1';
		const projectFolder = path.join(tmpTestfolder, projectName);

		// Create new project
		const parameters = [
			projectName,
			'-t', 'helloworldtest',
			'--init', 'googleAction',
			'--build',
			'--skip-npminstall',
			'--v1'];
		await runJovoCommand('new', parameters, tmpTestfolder, 'Installation completed.');

		// Tests
		expect(
			fs.existsSync(path.join(projectFolder,
				'platforms')))
			.toBe(true);
		expect(
			fs.existsSync(path.join(projectFolder,
				'platforms',
				'googleAction')))
			.toBe(true);
		expect(
			fs.existsSync(path.join(projectFolder,
				'platforms',
				'googleAction',
				'dialogflow')))
			.toBe(true);

		expect(
			fs.existsSync(path.join(projectFolder,
				'platforms',
				'googleAction',
				'dialogflow',
				'agent.json')))
			.toBe(true);
		const agentJson = JSON.parse(
			fs.readFileSync(path.join(projectFolder,
				'platforms',
				'googleAction',
				'dialogflow',
				'agent.json')).toString());

		expect(agentJson.webhook.url.substr(0, 27))
			.toBe('https://webhook.jovo.cloud/');

		expect(
			fs.existsSync(path.join(projectFolder,
				'platforms',
				'googleAction',
				'dialogflow',
				'intents')))
			.toBe(true);

		expect(
			fs.existsSync(path.join(projectFolder,
				'platforms',
				'googleAction',
				'dialogflow',
				'intents',
				'Default Fallback Intent.json')))
			.toBe(true);

		expect(
			fs.existsSync(path.join(projectFolder,
				'platforms',
				'googleAction',
				'dialogflow',
				'intents',
				'Default Welcome Intent.json')))
			.toBe(true);

		expect(
			fs.existsSync(path.join(projectFolder,
				'platforms',
				'googleAction',
				'dialogflow',
				'intents',
				'HelloWorldIntent.json')))
			.toBe(true);

		expect(
			fs.existsSync(path.join(projectFolder,
				'platforms',
				'googleAction',
				'dialogflow',
				'intents',
				'HelloWorldIntent_usersays_en.json')))
			.toBe(true);

		expect(
			fs.existsSync(path.join(projectFolder,
				'platforms',
				'googleAction',
				'dialogflow',
				'intents',
				'MyNameIsIntent.json')))
			.toBe(true);

		expect(
			fs.existsSync(path.join(projectFolder,
				'platforms',
				'googleAction',
				'dialogflow',
				'intents',
				'MyNameIsIntent_usersays_en.json')))
			.toBe(true);

		deleteFolderRecursive(projectFolder);
	}, 10000);

	it('jovo new <project> --init googleAction --build --locale de-DE --v1', async () => {
		const projectName = 'helloworld_initbuilddeDE_v1';
		const projectFolder = path.join(tmpTestfolder, projectName);

		// Create new project
		const parameters = [
			projectName,
			'-t', 'helloworldtest',
			'--init', 'googleAction',
			'--locale', 'de-DE',
			'--build',
			'--skip-npminstall',
			'--v1'];
		await runJovoCommand('new', parameters, tmpTestfolder, 'Installation completed.');

		// Tests
		expect(
			fs.existsSync(path.join(projectFolder,
				'platforms',
				'googleAction',
				'dialogflow',
				'intents',
				'HelloWorldIntent_usersays_de.json')))
			.toBe(true);

		expect(
			fs.existsSync(path.join(projectFolder,
				'platforms',
				'googleAction',
				'dialogflow',
				'intents',
				'MyNameIsIntent_usersays_de.json')))
			.toBe(true);
		deleteFolderRecursive(projectFolder);
	}, 10000);
});


describe('new v2', () => {
	it('jovo new <project>', async () => {
		const projectName = 'helloworld_v2';
		const projectFolder = path.join(tmpTestfolder, projectName);

		// Create new project
		const parameters = [
			projectName,
			'-t', 'helloworldtest',
			'--skip-npminstall'];
		await runJovoCommand('new', parameters, tmpTestfolder, 'Installation completed.');

		// Tests
		expect(fs.existsSync(path.join(projectFolder, 'project.js'))).toBe(true);
		expect(fs.existsSync(path.join(projectFolder, 'package.json'))).toBe(true);
		expect(JSON.parse(fs.readFileSync(path.join(projectFolder, 'package.json')).toString()).name).toBe('jovo-sample-voice-app-nodejs');
		expect(fs.existsSync(path.join(projectFolder, 'src', 'app.js'))).toBe(true);
		expect(fs.existsSync(path.join(projectFolder, 'src', 'index.js'))).toBe(true);
		expect(fs.existsSync(path.join(projectFolder, 'src', 'config.js'))).toBe(true);
		expect(fs.existsSync(path.join(projectFolder, 'models', 'en-US.json'))).toBe(true);

		deleteFolderRecursive(projectFolder);
	}, 10000);

	it('jovo new helloworld --locale de-DE', async () => {
		const projectName = 'helloworlddeDE_v2';
		const projectFolder = path.join(tmpTestfolder, projectName);

		// Create new project
		const parameters = [
			projectName,
			'-t', 'helloworldtest',
			'--locale', 'de-DE',
			'--skip-npminstall'];
		await runJovoCommand('new', parameters, tmpTestfolder, 'Installation completed.');

		// Tests
		expect(fs.existsSync(path.join(projectFolder, 'models', 'de-DE.json'))).toBe(true);

		deleteFolderRecursive(projectFolder);
	}, 10000);

	it('jovo new <project> --init alexaSkill', async () => {
		const projectName = 'helloworld_init_v2';
		const projectFolder = path.join(tmpTestfolder, projectName);

		// Create new project
		const parameters = [
			projectName,
			'-t', 'helloworldtest',
			'--init', 'alexaSkill',
			'--skip-npminstall'];
		await runJovoCommand('new', parameters, tmpTestfolder, null, 'got deprecated');

		// Tests
		deleteFolderRecursive(projectFolder);
	}, 10000);

	it('jovo new <project> --init alexaSkill --build', async () => {
		const projectName = 'helloworld_initbuild_alexaSkill_v2';
		const projectFolder = path.join(tmpTestfolder, projectName);

		// Create new project
		const parameters = [
			projectName,
			'-t', 'helloworldtest',
			'--init', 'alexaSkill',
			'--build',
			'--skip-npminstall'];
		await runJovoCommand('new', parameters, tmpTestfolder, null, 'got deprecated');

		// Tests
		deleteFolderRecursive(projectFolder);
	}, 10000);

	it('jovo new <project> --init googleAction', async () => {
		const projectName = 'helloworld_init_v2';
		const projectFolder = path.join(tmpTestfolder, projectName);

		// Create new project
		const parameters = [
			projectName,
			'-t', 'helloworldtest',
			'--init', 'googleAction',
			'--skip-npminstall'];
		await runJovoCommand('new', parameters, tmpTestfolder, null, 'got deprecated');

		// Tests
		deleteFolderRecursive(projectFolder);
	}, 10000);
});


afterAll((done) => {
	setTimeout(() => {
		deleteFolderRecursive(tmpTestfolder);
		done();
	}, 2000);
}, 5000);
