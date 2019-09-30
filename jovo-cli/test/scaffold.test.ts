import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import * as childProcess from 'child_process';
import * as path from 'path';
import { deleteFolderRecursive } from '../utils/Utils';
import { runJovoCommand } from './Helpers';

const testFolder = 'tmpTestFolderScaffold';
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

describe('scaffold', () => {
    it('jovo new <project> --init alexaSkill --build\n\tjovo scaffold\n\t>> Should fail if no language models exist', async () => {
        const projectName = 'jovo-cli-unit-test';

        const parameters = [
            projectName,
            '-t', 'helloworldtest',
            '--build', 'alexaSkill',
            '--skip-npminstall'
        ];

        const projectFolder = path.join(testFolder, projectName);
        await runJovoCommand('new', parameters, testFolder, 'Installation completed');

        // Delete handler file
        await exec('rm -rfp ./models/', { cwd: `${testFolder}/${projectName}` });

        const res = await runJovoCommand('scaffold', ['jovo-component-email'], projectFolder, 'The component \'jovo-component-email\' does not exist. Please check for spelling or install it with \'npm i jovo-component-email -s\'.');

        expect(res).toMatch(
            'No language model available in \'./models/\'. Please create at least one language model.'
        );
    }, 200000);

    it('jovo new <project> --init alexaSkill --build\n\tjovo scaffold\n\t>> Typescript Project', async () => {
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

        // Delete handler file
        await exec('rm -rfp ./src/app.ts', { cwd: `${testFolder}/${projectName}` });

        await runJovoCommand('scaffold', ['jovo-component-email'], projectFolder, 'Successfully scaffolded.');

        expect(existsSync(`${projectFolder}/src/app.ts`)).toBeTruthy();
    }, 200000);
});

