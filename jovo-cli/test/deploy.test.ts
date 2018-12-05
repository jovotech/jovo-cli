'use strict';

const tmpTestfolder = 'tmpTestfolderDeploy';

import 'jest';
import * as childProcess from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { deleteFolderRecursive } from '../utils/Utils';

const exec = childProcess.exec;
const spawn = childProcess.spawn;

const askProfile: string = (process.env && process.env.ASK_PROFILE) as string | '';


beforeAll((done) => {
	deleteFolderRecursive(tmpTestfolder);
	if (!fs.existsSync(tmpTestfolder)) {
		fs.mkdirSync(tmpTestfolder);
	}
	done();
}, 5000);


describe('deploy v1', () => {
	it('jovo new <project> --init alexaSkill --build --v1\n      jovo deploy', (done) => {
		if (!askProfile) {
			console.log('Skipping because no ask profile found');
			done();
		} else {
			const projectName = 'jovo-cli-unit-test_v1';
			const projectFolder = path.join(tmpTestfolder, projectName);
			const child = spawn('node', ['./../dist/index.js', 'new', projectName,
				'-t', 'helloworldtest',
				'--init', 'alexaSkill',
				'--build',
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

					const childDeploy = spawn('node', ['./../../dist/index.js',
						'deploy',
						'--ask-profile',
						askProfile.toString(),
					], {
							cwd: projectFolder,
						});
					childDeploy.stdout.on('data', (data) => {
						if (data.indexOf('Deployment completed.') > -1) {
							childDeploy.kill();
							const askConfig = JSON.parse(
								fs.readFileSync(path.join(
									projectFolder,
									'platforms',
									'alexaSkill',
									'.ask',
									'config')).toString());
							expect(askConfig.deploy_settings.default.skill_id.length > 0)
								.toBe(true);
							deleteSkill(askConfig.deploy_settings.default.skill_id, () => {
								done();
							});
						}
					});
				}
			});
		}
	}, 200000);

	it('jovo new <project> --init alexaSkill --build --v1\n      jovo deploy --target zip', (done) => {
		const projectName = 'jovo-cli-unit-test-zip_v1';
		const projectFolder = path.join(tmpTestfolder, projectName);
		const child = spawn('node', ['./../dist/index.js', 'new', projectName,
			'-t', 'helloworldtest',
			'--init', 'alexaSkill',
			'--build',
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

				const childDeploy = spawn('node', ['./../../dist/index.js',
					'deploy',
					'--target', 'zip',
				], {
						cwd: projectFolder,
					});
				childDeploy.stdout.on('data', (data) => {
					console.log(data.toString());
					if (data.indexOf('Deployment completed.') > -1) {
						childDeploy.kill();

						const zipFilePath = path.join(projectFolder, 'deployment-package.zip');

						// zip should exist
						expect(fs.existsSync(zipFilePath)).toBe(true);

						// zip should not be empty
						expect(fs.statSync(zipFilePath).size).not.toBe(0);

						done();
					}
				});
			}
		});
	}, 200000);


	it('jovo new <project> --init googleAction --build --v1\n      jovo deploy', (done) => {
		const projectName = 'helloworldDeployGoogleAction_v1';
		const projectFolder = path.join(tmpTestfolder, projectName);
		const child = spawn('node', ['./../dist/index.js', 'new', projectName,
			'-t', 'helloworldtest',
			'--init', 'googleAction',
			'--build',
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

				const childDeploy = spawn('node', ['./../../dist/index.js',
					'deploy',
				], {
						cwd: projectFolder,
					});
				childDeploy.stdout.on('data', (data) => {
					if (data.indexOf('Deployment completed.') > -1) {
						childDeploy.kill();

						const dialogflowAgentZipPath = path.join(projectFolder, 'platforms', 'googleAction', 'dialogflow_agent.zip');

						// Dialogflow agent zip should exist
						expect(fs.existsSync(dialogflowAgentZipPath)).toBe(true);

						// Dialogflow agent zip should not be empty
						expect(fs.statSync(dialogflowAgentZipPath).size).not.toBe(0);

						done();
					}
				});
			}
		});
	}, 200000);
});


describe('deploy v2', () => {
	it('jovo new <project> --init alexaSkill --build\n      jovo deploy', (done) => {
		if (!askProfile) {
			console.log('Skipping because no ask profile found');
			done();
		} else {
			const projectName = 'jovo-cli-unit-test_v2';
			const projectFolder = path.join(tmpTestfolder, projectName);
			const child = spawn('node', ['./../dist/index.js', 'new', projectName,
				'-t', 'helloworldtest',
				'--build', 'alexaSkill',
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

					const childDeploy = spawn('node', ['./../../dist/index.js',
						'deploy',
						'--ask-profile',
						askProfile.toString(),
					], {
							cwd: projectFolder,
						});
					childDeploy.stdout.on('data', (data) => {
						if (data.indexOf('Deployment completed.') > -1) {
							childDeploy.kill();
							const askConfig = JSON.parse(
								fs.readFileSync(path.join(
									projectFolder,
									'platforms',
									'alexaSkill',
									'.ask',
									'config')).toString());
							expect(askConfig.deploy_settings.default.skill_id.length > 0)
								.toBe(true);
							deleteSkill(askConfig.deploy_settings.default.skill_id, () => {
								done();
							});
						}
					});
				}
			});
		}
	}, 200000);



	it('jovo new <project> --init alexaSkill --build\n      jovo deploy --target zip', (done) => {
		const projectName = 'jovo-cli-unit-test-zip_v2';
		const projectFolder = path.join(tmpTestfolder, projectName);
		const child = spawn('node', ['./../dist/index.js', 'new', projectName,
			'-t', 'helloworldtest',
			'--build', 'alexaSkill',
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

				const childDeploy = spawn('node', ['./../../dist/index.js',
					'deploy',
					'--target', 'zip',
				], {
						cwd: projectFolder,
					});
				childDeploy.stdout.on('data', (data) => {
					if (data.indexOf('Deployment completed.') > -1) {
						childDeploy.kill();

						// Check if all the files in the dist folder exist
						expect(fs.existsSync(path.join(projectFolder, 'dist'))).toBe(true);
						expect(fs.existsSync(path.join(projectFolder, 'dist', 'app.js'))).toBe(true);
						expect(fs.existsSync(path.join(projectFolder, 'dist', 'config.js'))).toBe(true);
						expect(fs.existsSync(path.join(projectFolder, 'dist', 'index.js'))).toBe(true);
						expect(fs.existsSync(path.join(projectFolder, 'dist', 'package.json'))).toBe(true);
						expect(fs.existsSync(path.join(projectFolder, 'dist', 'node_modules'))).toBe(true);

						// zip should exist and is not empty
						const zipFilePath = path.join(projectFolder, 'deployment-package.zip');
						expect(fs.existsSync(zipFilePath)).toBe(true);
						expect(fs.statSync(zipFilePath).size).not.toBe(0);

						done();
					}
				});
			}
		});
	}, 20000);

	it('jovo new <project> --init googleAction --build\n      jovo deploy', (done) => {
		const projectName = 'helloworldDeployGoogleAction_v2';
		const projectFolder = path.join(tmpTestfolder, projectName);
		const child = spawn('node', ['./../dist/index.js', 'new', projectName,
			'-t', 'helloworldtest',
			'--build', 'googleAction',
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

				const childDeploy = spawn('node', ['./../../dist/index.js',
					'deploy',
				], {
						cwd: projectFolder,
					});
				childDeploy.stdout.on('data', (data) => {
					if (data.indexOf('Deployment completed.') > -1) {
						childDeploy.kill();

						const dialogflowAgentZipPath = path.join(projectFolder, 'platforms', 'googleAction', 'dialogflow_agent.zip');

						// Dialogflow agent zip should exist
						expect(fs.existsSync(dialogflowAgentZipPath)).toBe(true);

						// Dialogflow agent zip should not be empty
						expect(fs.statSync(dialogflowAgentZipPath).size).not.toBe(0);

						done();
					}
				});
			}
		});
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
function deleteSkill(skillId: string, callback: () => void) {
	exec('ask api delete-skill --skill-id ' + skillId, {
	}, (error, stdout, stderr) => {
		if (error) {
			console.log(error);
			if (stderr) {
				console.log(stderr);
			}
		}
		if (stdout.indexOf('Skill deleted successfully.') > -1) {
			callback();
		}
	});
}
