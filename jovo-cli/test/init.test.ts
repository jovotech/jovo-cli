'use strict';

const tmpTestfolder = 'tmpTestfolderInit';

import 'jest';
import * as childProcess from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { deleteFolderRecursive } from '../utils/Utils';

const spawn = childProcess.spawn;

beforeAll((done) => {
	deleteFolderRecursive(tmpTestfolder);
	if (!fs.existsSync(tmpTestfolder)) {
		fs.mkdirSync(tmpTestfolder);
	}
	done();
}, 5000);


describe('init v1', () => {
	it('jovo new <project> --v1\n      jovo init alexaSkill', (done) => {
		const projectName = 'helloworld_v1';
		const projectFolder = tmpTestfolder + path.sep + projectName;
		const child = spawn('node', ['./../dist/index.js', 'new', projectName,
			'-t', 'helloworldtest',
			'--skip-npminstall',
			'--v1'], {
				cwd: tmpTestfolder,
			});
		child.stderr.on('data', (data) => {
			console.log(data.toString());
			done();
		});
		child.stdout.on('data', (data) => {
			if (data.indexOf('Installation completed.') > -1) {
				child.kill();
				const childInit = spawn('node', ['./../../dist/index.js',
					'init', 'alexaSkill'], {
						cwd: projectFolder,
					});
				childInit.stdout.on('data', (data) => {
					if (data.indexOf('Initialization completed.') > -1) {
						childInit.kill();
						expect(fs.existsSync(path.join(projectFolder, 'app.json'))).toBe(true);
						const appJson = JSON.parse(fs.readFileSync(path.join(projectFolder, 'app.json')).toString());
						expect(appJson.alexaSkill.nlu.name)
							.toBe('alexa');
						expect(appJson.endpoint.substr(0, 27))
							.toBe('https://webhook.jovo.cloud/');
						done();
					}
				});
			}
		});
	}, 12000);
	it('jovo new <project> --v1\n      jovo init googleAction', (done) => {
		const projectName = 'helloworld2_v1';
		const projectFolder = tmpTestfolder + path.sep + projectName;
		const child = spawn('node', ['./../dist/index.js', 'new', projectName,
			'-t', 'helloworldtest',
			'--skip-npminstall',
			'--v1'], {
				cwd: tmpTestfolder,
			});
		child.stderr.on('data', (data) => {
			console.log(data.toString());
			done();
		});
		child.stdout.on('data', (data) => {
			if (data.indexOf('Installation completed.') > -1) {
				child.kill();
				const childInit = spawn('node', ['./../../dist/index.js',
					'init', 'googleAction'], {
						cwd: projectFolder,
					});
				childInit.stdout.on('data', (data) => {
					if (data.indexOf('Initialization completed.') > -1) {
						childInit.kill();
						expect(fs.existsSync(projectFolder + path.sep + 'app.json')).toBe(true);
						const appJson = JSON.parse(fs.readFileSync(path.join(projectFolder, 'app.json')).toString());
						expect(appJson.googleAction.nlu.name)
							.toBe('dialogflow');
						expect(appJson.endpoint.substr(0, 27))
							.toBe('https://webhook.jovo.cloud/');
						done();
					}
				});
			}
		});
	}, 12000);
	it('jovo new <project> --v1\n      jovo init alexaSkill --build', (done) => {
		const projectName = 'helloworldInitBuildAlexa_v1';
		const projectFolder = tmpTestfolder + path.sep + projectName;
		const child = spawn('node', ['./../dist/index.js', 'new', projectName,
			'-t', 'helloworldtest',
			'--skip-npminstall',
			'--v1'], {
				cwd: tmpTestfolder,
			});
		child.stderr.on('data', (data) => {
			console.log(data.toString());
			done();
		});
		child.stdout.on('data', (data) => {
			if (data.indexOf('Installation completed.') > -1) {
				child.kill();
				const childInit = spawn('node', ['./../../dist/index.js',
					'init', 'alexaSkill',
					'--build'], {
						cwd: projectFolder,
					});
				childInit.stdout.on('data', (data) => {
					if (data.indexOf('Initialization completed.') > -1) {
						childInit.kill();
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
						done();
					}
				});
			}
		});
	}, 12000);
	it('jovo new <project> --v1\n      jovo init googleAction --build', (done) => {
		const projectName = 'helloworldInitBuildGoogleAction_v1';
		const projectFolder = path.join(tmpTestfolder, projectName);
		const child = spawn('node', ['./../dist/index.js', 'new', projectName,
			'-t', 'helloworldtest',
			'--skip-npminstall',
			'--v1'], {
				cwd: tmpTestfolder,
			});
		child.stderr.on('data', (data) => {
			console.log(data.toString());
			done();
		});
		child.stdout.on('data', (data) => {
			if (data.indexOf('Installation completed.') > -1) {
				child.kill();
				const childInit = spawn('node', ['./../../dist/index.js',
					'init', 'googleAction',
					'--build'], {
						cwd: projectFolder,
					});
				childInit.stdout.on('data', (data) => {
					if (data.indexOf('Initialization completed.') > -1) {
						childInit.kill();
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
						done();
					}
				});
			}
		});
	}, 12000);
});


describe('init v2', () => {
	it('jovo new <project>\n      jovo init alexaSkill', (done) => {
		const projectName = 'helloworld_v2';
		const projectFolder = tmpTestfolder + path.sep + projectName;
		const child = spawn('node', ['./../dist/index.js', 'new', projectName,
			'-t', 'helloworldtest',
			'--skip-npminstall'], {
				cwd: tmpTestfolder,
			});
		child.stderr.on('data', (data) => {
			console.log(data.toString());
			done();
		});
		child.stdout.on('data', (data) => {
			if (data.indexOf('Installation completed.') > -1) {
				child.kill();
				const childInit = spawn('node', ['./../../dist/index.js',
					'init', 'alexaSkill'], {
						cwd: projectFolder,
					});
				childInit.stderr.on('data', (data) => {

					// init command is not allowed with v2 so we check for that message
					if (data.toString().indexOf('got deprecated') > -1) {
						done();
						deleteFolderRecursive(projectFolder);
					}
				});
			}
		});
	}, 12000);
});


afterAll((done) => {
	setTimeout(() => {
		deleteFolderRecursive(tmpTestfolder);
		done();
	}, 2000);
}, 5000);
