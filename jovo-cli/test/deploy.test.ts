import { exec } from 'child_process';
import { mkdirSync, readFileSync, existsSync, statSync } from 'fs';
import * as path from 'path';
import { deleteFolderRecursive } from '../src/utils';
import { runJovoCommand } from './Helpers';

const tmpTestFolder = 'tmpTestFolderDeploy';

beforeAll(() => {
  deleteFolderRecursive(tmpTestFolder);
  mkdirSync(tmpTestFolder);
});

afterAll(() => {
  deleteFolderRecursive(tmpTestFolder);
});

describe('deploy', () => {
  it('jovo new <project> --build\n      jovo deploy --platform alexaSkill', async () => {
    if (!process.env.ASK_PROFILE) {
      console.log('Skipping because no ask profile found');
      return;
    }

    const projectName = 'jovo-cli-unit-test';

    // Create new project
    const newParameters = [projectName, '-t', 'helloworldtest', '--build', 'alexaSkill'];
    await runJovoCommand('new', newParameters, tmpTestFolder, 'Installation completed.');

    // Deploy project
    const deployParameters = ['--platform', 'alexaSkill'];

    if (process.env.ASK_PROFILE) {
      deployParameters.push('--ask-profile', process.env.ASK_PROFILE);
    }

    const projectFolder = path.join(tmpTestFolder, projectName);
    await runJovoCommand('deploy', deployParameters, projectFolder, 'Deployment completed.');

    // Tests
    const askConfig = JSON.parse(
      readFileSync(path.join(projectFolder, 'platforms', 'alexaSkill', '.ask', 'config'), 'utf-8'),
    );
    expect(askConfig.deploy_settings.default.skill_id.length > 0).toBe(true);

    await deleteSkill(askConfig.deploy_settings.default.skill_id);
  }, 200000);

  it('jovo new <project> --build\n      jovo deploy --target zip', async () => {
    const projectName = 'jovo-cli-unit-test-zip';

    // Create new project
    const parameters = [projectName, '-t', 'helloworldtest', '--build', 'alexaSkill'];
    await runJovoCommand('new', parameters, tmpTestFolder, 'Installation completed.');

    // Deploy project
    const projectFolder = path.join(tmpTestFolder, projectName);
    await runJovoCommand('deploy', ['--target', 'zip'], projectFolder, 'Deployment completed.');

    // Tests
    const zipFilePath = path.join(projectFolder, 'bundle.zip');

    // zip should exist
    expect(existsSync(zipFilePath)).toBe(true);

    // zip should not be empty
    expect(statSync(zipFilePath).size).not.toBe(0);
  }, 100000);

  it('jovo new <project> --build\n      jovo deploy --platform googleAction', async () => {
    const projectName = 'helloworldDeployGoogleAction';

    // Create new project
    const parameters = [projectName, '-t', 'helloworldtest', '--build', 'googleAction'];
    await runJovoCommand('new', parameters, tmpTestFolder, 'Installation completed.');

    // Deploy project
    const projectFolder = path.join(tmpTestFolder, projectName);
    await runJovoCommand(
      'deploy',
      ['--platform', 'googleAction'],
      projectFolder,
      'Deployment completed.',
    );

    // Tests
    const dialogflowAgentZipPath = path.join(
      projectFolder,
      'platforms',
      'googleAction',
      'dialogflow_agent.zip',
    );

    // Dialogflow agent zip should exist
    expect(existsSync(dialogflowAgentZipPath)).toBe(true);

    // Dialogflow agent zip should not be empty
    expect(statSync(dialogflowAgentZipPath).size).not.toBe(0);
  }, 200000);
});

/**
 * Deletes skill from ASK
 * @param {string} skillId
 * @param {function} callback
 */
async function deleteSkill(skillId: string) {
  return new Promise((resolve, reject) => {
    exec('ask api delete-skill --skill-id ' + skillId, {}, (error, stdout, stderr) => {
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
