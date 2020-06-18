import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { exec } from 'child_process';
import { join } from 'path';
import { deleteFolderRecursive } from '../src/utils';
import { runJovoCommand } from './Helpers';
import { promisify } from 'util';

const tmpTestFolder = 'tmpTestFolderLoad';
const execAsync = promisify(exec);

beforeAll(() => {
  deleteFolderRecursive(tmpTestFolder);
  mkdirSync(tmpTestFolder);
});

afterAll(() => {
  deleteFolderRecursive(tmpTestFolder);
});

describe('load', () => {
  it("jovo new <project> --build\n\tjovo load jovo-component-email\n\t>> Should fail if component doesn't exist", async () => {
    if (!process.env.ASK_PROFILE) {
      console.log('Skipping because no ask profile found');
      return;
    }
    
    const projectName = 'jovo-cli-unit-test-load-fail';

    const parameters = [
      projectName,
      '-t',
      'helloworldtest',
      '--build',
      'alexaSkill',
      '--skip-npminstall',
    ];

    const projectFolder = join(tmpTestFolder, projectName);
    await runJovoCommand('new', parameters, tmpTestFolder, 'Installation completed');

    // Load component
    const res = await runJovoCommand(
      'load',
      ['jovo-component-email'],
      projectFolder,
      '',
      "The component 'jovo-component-email' does not exist.",
    );

    expect(
      res.indexOf("The component 'jovo-component-email' does not exist.") > -1,
    ).toBeTruthy();
  }, 200000);

  it('jovo new <project> --init alexaSkill --build\n\tjovo load jovo-component-email\n\t>> Typescript Project\n\t>> Typescript Component', async () => {
    if (!process.env.ASK_PROFILE) {
      console.log('Skipping because no ask profile found');
      return;
    }
    
    const projectName = 'jovo-cli-unit-test-load-ts-ts';

    const parameters = [
      projectName,
      '-t',
      'helloworldtest',
      '--build',
      'alexaSkill',
      '--skip-npminstall',
      '--language',
      'typescript',
    ];

    const projectFolder = join(tmpTestFolder, projectName);
    await runJovoCommand('new', parameters, tmpTestFolder, 'Installation completed');

    // Create fake component
    await execAsync('mkdir node_modules/jovo-component-email/dist/ -p', {
      cwd: projectFolder,
    });
    await execAsync('touch index.ts README.md package.json', {
      cwd: `${projectFolder}/node_modules/jovo-component-email`,
    });

    const packageJson = {
      devDependencies: {
        typescript: '^1.0.0',
      },
    };

    writeFileSync(
      `${projectFolder}/node_modules/jovo-component-email/package.json`,
      JSON.stringify(packageJson),
    );

    // Load component
    await runJovoCommand(
      'load',
      ['jovo-component-email'],
      projectFolder,
      'Successfully copied jovo-component-email into ./src/components.',
    );

    expect(existsSync(`${projectFolder}/src/components/jovo-component-email`)).toBeTruthy();
    expect(existsSync(`${projectFolder}/src/components/jovo-component-email/dist`)).toBeFalsy();
    expect(
      existsSync(`${projectFolder}/src/components/jovo-component-email/index.ts`),
    ).toBeTruthy();
  }, 200000);

  it('jovo new <project> --init alexaSkill --build\n\tjovo load jovo-component-email\n\t>> Javascript Project\n\t>> Typescript Component', async () => {
    if (!process.env.ASK_PROFILE) {
      console.log('Skipping because no ask profile found');
      return;
    }
    
    const projectName = 'jovo-cli-unit-test-load-js-ts';

    const parameters = [
      projectName,
      '-t',
      'helloworldtest',
      '--build',
      'alexaSkill',
      '--skip-npminstall',
    ];

    const projectFolder = join(tmpTestFolder, projectName);
    await runJovoCommand('new', parameters, tmpTestFolder, 'Installation completed');

    // Create fake component
    await execAsync('mkdir node_modules/jovo-component-email/dist/src -p', {
      cwd: `${tmpTestFolder}/${projectName}`,
    });
    await execAsync('mkdir node_modules/jovo-component-email/src/ -p', {
      cwd: `${tmpTestFolder}/${projectName}`,
    });
    await execAsync(
      'touch index.ts README.md package.json tsconfig.json src/handler.ts dist/index.js dist/src/handler.js',
      {
        cwd: `${tmpTestFolder}/${projectName}/node_modules/jovo-component-email`,
      },
    );

    const packageJson = {
      devDependencies: {
        typescript: '^3.5.2',
      },
    };

    writeFileSync(
      `${tmpTestFolder}/${projectName}/node_modules/jovo-component-email/package.json`,
      JSON.stringify(packageJson),
    );

    // Load component
    await runJovoCommand(
      'load',
      ['jovo-component-email'],
      projectFolder,
      'Successfully copied jovo-component-email into ./src/components.',
    );

    expect(existsSync(`${projectFolder}/src/components/jovo-component-email`)).toBeTruthy();
    expect(
      existsSync(`${projectFolder}/src/components/jovo-component-email/index.js`),
    ).toBeTruthy();
    expect(
      existsSync(`${projectFolder}/src/components/jovo-component-email/src/handler.js`),
    ).toBeTruthy();
    expect(existsSync(`${projectFolder}/src/components/jovo-component-email/dist`)).toBeFalsy();
    expect(
      existsSync(`${projectFolder}/src/components/jovo-component-email/src/handler.ts`),
    ).toBeFalsy();
    expect(existsSync(`${projectFolder}/src/components/jovo-component-email/index.ts`)).toBeFalsy();
  }, 200000);

  it('jovo new <project> --init alexaSkill --build\n\tjovo load jovo-component-email\n\t>> Typescript Project\n\t>> Javascript Component', async () => {
    if (!process.env.ASK_PROFILE) {
      console.log('Skipping because no ask profile found');
      return;
    }
    
    const projectName = 'jovo-cli-unit-test-load-ts-js';

    const parameters = [
      projectName,
      '-t',
      'helloworldtest',
      '--build',
      'alexaSkill',
      '--skip-npminstall',
      '--language',
      'typescript',
    ];

    const projectFolder = join(tmpTestFolder, projectName);
    await runJovoCommand('new', parameters, tmpTestFolder, 'Installation completed');

    // Create fake component
    await execAsync('mkdir node_modules/jovo-component-email/ -p', {
      cwd: projectFolder,
    });
    await execAsync('touch index.js README.md', {
      cwd: `${projectFolder}/node_modules/jovo-component-email`,
    });
    await execAsync('echo {} > package.json', {
      cwd: `${projectFolder}/node_modules/jovo-component-email`,
    });

    // Load component
    await runJovoCommand(
      'load',
      ['jovo-component-email'],
      projectFolder,
      'Successfully copied jovo-component-email into ./src/components.',
    );

    expect(existsSync(`${projectFolder}/src/components/jovo-component-email`)).toBeTruthy();
    expect(
      existsSync(`${projectFolder}/src/components/jovo-component-email/index.js`),
    ).toBeTruthy();
  }, 200000);

  it('jovo new <project> --init alexaSkill --build\n\tjovo load jovo-component-email\n\t>> Javascript Project\n\t>> Javascript Component', async () => {
    if (!process.env.ASK_PROFILE) {
      console.log('Skipping because no ask profile found');
      return;
    }
    
    const projectName = 'jovo-cli-unit-test-load-js-js';

    const parameters = [
      projectName,
      '-t',
      'helloworldtest',
      '--build',
      'alexaSkill',
      '--skip-npminstall',
    ];

    const projectFolder = join(tmpTestFolder, projectName);
    await runJovoCommand('new', parameters, tmpTestFolder, 'Installation completed');

    // Create fake component
    await execAsync('mkdir node_modules/jovo-component-email/dist/ -p', {
      cwd: `${tmpTestFolder}/${projectName}`,
    });
    await execAsync('touch index.js README.md dist/index.js', {
      cwd: `${tmpTestFolder}/${projectName}/node_modules/jovo-component-email`,
    });
    await execAsync('echo {} > package.json', {
      cwd: `${tmpTestFolder}/${projectName}/node_modules/jovo-component-email`,
    });

    // Load component
    await runJovoCommand(
      'load',
      ['jovo-component-email'],
      projectFolder,
      'Successfully copied jovo-component-email into ./src/components.',
    );

    expect(existsSync(`${projectFolder}/src/components/jovo-component-email`)).toBeTruthy();
    expect(
      existsSync(`${projectFolder}/src/components/jovo-component-email/index.js`),
    ).toBeTruthy();
  }, 200000);
});
