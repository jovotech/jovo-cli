import { mkdirSync } from 'fs';
import * as path from 'path';
import { deleteFolderRecursive } from '../src/utils';
import { runJovoCommand } from './Helpers';

const tmpTestFolder = 'tmpTestFolderRun';

beforeAll(() => {
  deleteFolderRecursive(tmpTestFolder);
  mkdirSync(tmpTestFolder);
});

afterAll(() => {
  deleteFolderRecursive(tmpTestFolder);
});

describe('run', () => {
  it('jovo run', async () => {
    if (!process.env.ASK_PROFILE) {
      console.log('Skipping because no ask profile found');
      return;
    }

    const projectName = 'helloworldRun';
    const projectFolder = path.join(tmpTestFolder, projectName);

    // Create new project
    const parameters = [projectName, '-t', 'helloworldtest'];
    await runJovoCommand('new', parameters, tmpTestFolder, 'Installation completed.');

    return await runJovoCommand('run', [], projectFolder, 'This is your webhook url:');
  }, 200000);

  it('jovo run --webhook-standalone', async () => {
    if (!process.env.ASK_PROFILE) {
      console.log('Skipping because no ask profile found');
      return;
    }

    const projectName = 'helloworldRun-standalone';
    const projectFolder = path.join(tmpTestFolder, projectName);

    // Create new project
    const parameters = [projectName, '-t', 'helloworldtest'];
    await runJovoCommand('new', parameters, tmpTestFolder, 'Installation completed.');

    return await runJovoCommand(
      'run',
      ['--webhook-only'],
      projectFolder,
      'This is your webhook url:',
    );
  }, 200000);
});
