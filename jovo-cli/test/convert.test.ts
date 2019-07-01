import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import * as childProcess from 'child_process';
import * as path from 'path';
import { deleteFolderRecursive } from '../utils/Utils';
import { runJovoCommand } from './Helpers';

const testFolder = 'tmpTestFolder';
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

describe('convert v1', () => {
    it('jovo new <project> --init alexaSkill --build --v1\n      jovo convert i18nToCsv', async () => {
        const projectName = 'jovo-cli-unit-test_v1';

        const params = [
            projectName,
            '-t',
            'helloworldtest',
            '--init',
            'alexaSkill',
            '--build',
            '--skip-npminstall',
            '--v1'
        ];

        const projectFolder = path.join(testFolder, projectName);
        await runJovoCommand('new', params, testFolder, 'Installation completed');

        // Create i18n files
        const i18n = {
            translation: {
                WELCOME: 'Hello World',
                GOODBYE: ['Bye', 'Goodbye']
            },
            AlexaSkill: {
                translation: {
                    GOODBYE: 'Alexa says Goodbye'
                }
            }
        };
        await exec('mkdir src/i18n -p', { cwd: projectFolder });
        writeFileSync(`${projectFolder}/src/i18n/en-US.json`, i18n);

        await runJovoCommand('convert', ['i18nToCsv', '--from ./src/i18n'], projectFolder, 'Preparation completed');

        const csv = 'key,en-US,en-US-AlexaSkill\n' +
            'WELCOME,Hello World,\n' +
            'GOODBYE,Bye,Alexa says Goodbye\n' +
            'GOODBYE,Goodbye,';

        expect(readFileSync(`${projectFolder}/responses.csv`, { encoding: 'utf-8' })).toMatch(csv);
    });

    it('jovo new <project> --init alexaSkill --build --v1\n      jovo convert csvToI18n', async () => {
        const projectName = 'jovo-cli-unit-test_v1';

        const params = [
            projectName,
            '-t',
            'helloworldtest',
            '--init',
            'alexaSkill',
            '--build',
            '--skip-npminstall',
            '--v1'
        ];

        const projectFolder = path.join(testFolder, projectName);
        await runJovoCommand('new', params, testFolder, 'Installation completed');

        const csv = 'key,en-US,en-US-AlexaSkill\n' +
            'WELCOME,Hello World,\n' +
            'GOODBYE,Bye,Alexa says Goodbye\n' +
            'GOODBYE,Goodbye,';

        await exec(`echo ${csv} > src/responses.csv`, { cwd: projectFolder });
        // await exec('mkdir src/i18n -p', { cwd: projectFolder });
        // writeFileSync(`${projectFolder}/src/i18n/en-US.json`, i18n);

        await runJovoCommand('convert', ['csvToI18n', '--from ./responses.csv'], projectFolder, 'Preparation completed');

        const i18n = {
            translation: {
                WELCOME: 'Hello World',
                GOODBYE: ['Bye', 'Goodbye']
            },
            AlexaSkill: {
                translation: {
                    GOODBYE: 'Alexa says Goodbye'
                }
            }
        };

        expect(JSON.parse(readFileSync(`${projectFolder}/i18n/en-US.json`, { encoding: 'utf-8' }))).toStrictEqual(i18n);
    });
});

describe('convert v2', () => {
    it('jovo new <project> --init alexaSkill --build\n      jovo convert i18nToCsv', async () => {
        const projectName = 'jovo-cli-unit-test_v2';

        const params = [
            projectName,
            '-t',
            'helloworldtest',
            '--init',
            'alexaSkill',
            '--build',
            '--skip-npminstall'
        ];

        const projectFolder = path.join(testFolder, projectName);
        await runJovoCommand('new', params, testFolder, 'Installation completed');

        // Create i18n files
        const i18n = {
            translation: {
                WELCOME: 'Hello World',
                GOODBYE: ['Bye', 'Goodbye']
            },
            AlexaSkill: {
                translation: {
                    GOODBYE: 'Alexa says Goodbye'
                }
            }
        };
        await exec('mkdir src/i18n -p', { cwd: projectFolder });
        writeFileSync(`${projectFolder}/src/i18n/en-US.json`, i18n);

        await runJovoCommand('convert', ['i18nToCsv', '--from ./src/i18n'], projectFolder, 'Preparation completed');

        const csv = 'key,en-US,en-US-AlexaSkill\n' +
            'WELCOME,Hello World,\n' +
            'GOODBYE,Bye,Alexa says Goodbye\n' +
            'GOODBYE,Goodbye,';

        expect(readFileSync(`${projectFolder}/responses.csv`, { encoding: 'utf-8' })).toMatch(csv);
    });

    it('jovo new <project> --init alexaSkill --build\n      jovo convert csvToI18n', async () => {
        const projectName = 'jovo-cli-unit-test_v2';

        const params = [
            projectName,
            '-t',
            'helloworldtest',
            '--init',
            'alexaSkill',
            '--build',
            '--skip-npminstall'
        ];

        const projectFolder = path.join(testFolder, projectName);
        await runJovoCommand('new', params, testFolder, 'Installation completed');

        const csv = 'key,en-US,en-US-AlexaSkill\n' +
            'WELCOME,Hello World,\n' +
            'GOODBYE,Bye,Alexa says Goodbye\n' +
            'GOODBYE,Goodbye,';

        await exec(`echo ${csv} > src/responses.csv`, { cwd: projectFolder });
        // await exec('mkdir src/i18n -p', { cwd: projectFolder });
        // writeFileSync(`${projectFolder}/src/i18n/en-US.json`, i18n);

        await runJovoCommand('convert', ['csvToI18n', '--from ./responses.csv'], projectFolder, 'Preparation completed');

        const i18n = {
            translation: {
                WELCOME: 'Hello World',
                GOODBYE: ['Bye', 'Goodbye']
            },
            AlexaSkill: {
                translation: {
                    GOODBYE: 'Alexa says Goodbye'
                }
            }
        };

        expect(JSON.parse(readFileSync(`${projectFolder}/i18n/en-US.json`, { encoding: 'utf-8' }))).toStrictEqual(i18n);
    });

    it('jovo new <project> --init alexaSkill --build\n      jovo convert csvToI18n --to ./ownI18nFolder', async () => {
        const projectName = 'jovo-cli-unit-test_v2';

        const params = [
            projectName,
            '-t',
            'helloworldtest',
            '--init',
            'alexaSkill',
            '--build',
            '--skip-npminstall'
        ];

        const projectFolder = path.join(testFolder, projectName);
        await runJovoCommand('new', params, testFolder, 'Installation completed');

        const csv = 'key,en-US,en-US-AlexaSkill\n' +
            'WELCOME,Hello World,\n' +
            'GOODBYE,Bye,Alexa says Goodbye\n' +
            'GOODBYE,Goodbye,';

        await exec(`echo ${csv} > src/responses.csv`, { cwd: projectFolder });

        const convertParams = [
            'csvToI18n',
            '--from ./responses.csv',
            '--to ./ownI18nFolder'
        ];
        await runJovoCommand('convert', convertParams, projectFolder, 'Preparation completed');

        const i18n = {
            translation: {
                WELCOME: 'Hello World',
                GOODBYE: ['Bye', 'Goodbye']
            },
            AlexaSkill: {
                translation: {
                    GOODBYE: 'Alexa says Goodbye'
                }
            }
        };

        expect(JSON.parse(readFileSync(`${projectFolder}/i18n/en-US.json`, { encoding: 'utf-8' }))).toStrictEqual(i18n);
    });
});

// describe('more complex data structures', () => {

// });
