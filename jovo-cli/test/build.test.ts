const tmpTestfolder = 'tmpTestfolderBuild';

import 'jest';
import * as fs from 'fs';
import * as path from 'path';
import { deleteFolderRecursive } from '../utils/Utils';
import { runJovoCommand } from './Helpers';

beforeAll((done) => {
	deleteFolderRecursive(tmpTestfolder);
	if (!fs.existsSync(tmpTestfolder)) {
		fs.mkdirSync(tmpTestfolder);
	}
	done();
}, 5000);


describe('build v1', () => {
	it('jovo new <project> --init alexaSkill --v1 \n      jovo build', async () => {
		const projectName = 'helloworld_v1';

		// Create new project
		const parameters = [
			projectName,
			'-t', 'helloworldtest',
			'--init', 'alexaSkill',
			'--skip-npminstall',
			'--v1'];
		await runJovoCommand('new', parameters, tmpTestfolder, 'Installation completed.');

		// Build project
		const projectFolder = path.join(tmpTestfolder, projectName);
		await runJovoCommand('build', [], projectFolder, 'Build completed.');

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
	}, 12000);

	it('jovo new <project> --init googleAction --v1 \n      jovo build', async () => {
		const projectName = 'helloworld2_v1';

		// Create new project
		const parameters = [
			projectName,
			'-t', 'helloworldtest',
			'--init', 'googleAction',
			'--skip-npminstall',
			'--v1'];
		await runJovoCommand('new', parameters, tmpTestfolder, 'Installation completed.');

		// Build project
		const projectFolder = path.join(tmpTestfolder, projectName);
		await runJovoCommand('build', [], projectFolder, 'Build completed.');

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
	}, 12000);

	it('jovo new <project> --init alexaSkill --build --v1 \n      jovo build --reverse', async () => {
		const projectName = 'helloworld_reverse_alexaSkill_v1';

		// Create new project
		const parameters = [
			projectName,
			'-t', 'helloworldtest',
			'--init', 'alexaSkill',
			'--build',
			'--skip-npminstall',
			'--v1'];
		await runJovoCommand('new', parameters, tmpTestfolder, 'Installation completed.');

		const projectFolder = path.join(tmpTestfolder, projectName);

		// Delete model file to avoid having to select if it should be overwritten
		fs.unlinkSync(path.join(projectFolder, 'models', 'en-US.json'));

		// Build project
		await runJovoCommand('build', ['--reverse'], projectFolder, 'Build completed.');

		// Tests
		expect(fs.existsSync(path.join(projectFolder, 'models', 'en-US.json'))).toBe(true);
		const modelJson = JSON.parse(
			fs.readFileSync(path.join(
				projectFolder,
				'models',
				'en-US.json')).toString());
		expect(modelJson.invocation)
			.toBe('my test app');
	}, 12000);

	it('jovo new <project> --init googleAction --build --v1 \n      jovo build --reverse', async () => {
		const projectName = 'helloworld_reverse_googleAction_v1';

		// Create new project
		const parameters = [
			projectName,
			'-t', 'helloworldtest',
			'--init', 'googleAction',
			'--build',
			'--skip-npminstall',
			'--v1'];
		await runJovoCommand('new', parameters, tmpTestfolder, 'Installation completed.');

		const projectFolder = path.join(tmpTestfolder, projectName);

		// Delete model file to avoid having to select if it should be overwritten
		fs.unlinkSync(path.join(projectFolder, 'models', 'en-US.json'));

		// Build project
		await runJovoCommand('build', ['--reverse'], projectFolder, 'Build completed.');

		// Tests
		expect(fs.existsSync(path.join(projectFolder, 'models', 'en.json'))).toBe(true);
		const modelJson = JSON.parse(
			fs.readFileSync(path.join(
				projectFolder,
				'models',
				'en.json')).toString());
		expect(modelJson.invocation.length === 0)
			.toBe(true);
	}, 12000);

});


describe('build v2', () => {
	it('jovo new <project> --init alexaSkill \n      jovo build', async () => {
		const projectName = 'helloworld_v2';

		// Create new project
		const parameters = [
			projectName,
			'-t', 'helloworldtest',
			'--skip-npminstall'];
		await runJovoCommand('new', parameters, tmpTestfolder, 'Installation completed.');

		// Build project
		const projectFolder = path.join(tmpTestfolder, projectName);
		await runJovoCommand('build', ['--platform', 'alexaSkill'], projectFolder, 'Build completed.');

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
	}, 12000);


	it('jovo new <project> --init googleAction \n      jovo build', async () => {
		const projectName = 'helloworld2_v2';

		// Create new project
		const parameters = [
			projectName,
			'-t', 'helloworldtest',
			'--skip-npminstall'];
		await runJovoCommand('new', parameters, tmpTestfolder, 'Installation completed.');

		// Build project
		const projectFolder = path.join(tmpTestfolder, projectName);
		await runJovoCommand('build', ['--platform', 'googleAction'], projectFolder, 'Build completed.');

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
	}, 12000);

	it('jovo new <project> --init alexaSkill --build \n      jovo build --reverse', async () => {
		const projectName = 'helloworld_reverse_alexaSkill_v2';

		// Create new project
		const parameters = [
			projectName,
			'-t', 'helloworldtest',
			'--build', 'alexaSkill',
			'--skip-npminstall'];
		await runJovoCommand('new', parameters, tmpTestfolder, 'Installation completed.');

		const projectFolder = path.join(tmpTestfolder, projectName);

		// Delete model file to avoid having to select if it should be overwritten
		fs.unlinkSync(path.join(projectFolder, 'models', 'en-US.json'));

		// Build project
		await runJovoCommand('build', ['--platform', 'alexaSkill', '--reverse'], projectFolder, 'Build completed.');

		// Tests
		expect(fs.existsSync(path.join(projectFolder, 'models', 'en-US.json'))).toBe(true);
		const modelJson = JSON.parse(
			fs.readFileSync(path.join(
				projectFolder,
				'models',
				'en-US.json')).toString());
		expect(modelJson.invocation)
			.toBe('my test app');
	}, 12000);

	it('jovo new <project> --init googleAction --build \n      jovo build --reverse', async () => {
		const projectName = 'helloworld_reverse_googleAction_v2';

		// Create new project
		const parameters = [
			projectName,
			'-t', 'helloworldtest',
			'--build', 'googleAction',
			'--skip-npminstall'];
		await runJovoCommand('new', parameters, tmpTestfolder, 'Installation completed.');

		const projectFolder = path.join(tmpTestfolder, projectName);

		// Delete model file to avoid having to select if it should be overwritten
		fs.unlinkSync(path.join(projectFolder, 'models', 'en-US.json'));

		// Build project
		await runJovoCommand('build', ['--platform', 'googleAction', '--reverse'], projectFolder, 'Build completed.');

		// Tests
		expect(fs.existsSync(path.join(projectFolder, 'models', 'en.json'))).toBe(true);
		const modelJson = JSON.parse(
			fs.readFileSync(path.join(
				projectFolder,
				'models',
				'en.json')).toString());
		expect(modelJson.invocation.length === 0)
			.toBe(true);
	}, 12000);

});

afterAll((done) => {
	setTimeout(() => {
		deleteFolderRecursive(tmpTestfolder);
		done();
	}, 3000);
}, 5000);
