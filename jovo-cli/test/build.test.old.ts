import { mkdirSync, existsSync, readFileSync } from 'fs';
import * as path from 'path';
import { deleteFolderRecursive } from '../src/utils';
import { runJovoCommand } from './Helpers';
import { ask } from 'jovo-cli-platform-alexa';
const tmpTestFolder = 'tmpTestFolderBuild';

beforeAll(() => {
  deleteFolderRecursive(tmpTestFolder);
  mkdirSync(tmpTestFolder);
});

afterAll(() => {
  deleteFolderRecursive(tmpTestFolder);
}, 5000);

describe('build', () => {
  it('jovo new <project>\n      jovo build --platform alexaSkill', async () => {
    if (!process.env.ASK_PROFILE) {
      console.log('Skipping because no ask profile found');
      return;
    }

    const projectName = 'helloworld';

    // Create new project
    const parameters = [projectName, '-t', 'helloworldtest', '--skip-npminstall'];

    await runJovoCommand('new', parameters, tmpTestFolder, 'Installation completed.');

    // Build project
    const projectFolder = path.join(tmpTestFolder, projectName);
    await runJovoCommand('build', ['--platform', 'alexaSkill'], projectFolder, 'Build completed.');

    expect(existsSync(path.join(projectFolder, 'platforms'))).toBe(true);
    expect(existsSync(path.join(projectFolder, 'platforms', 'alexaSkill'))).toBe(true);

    const askVersion = ask.checkAsk();
    let skillJsonPath: string, modelPath: string;
    if (askVersion === '2') {
      // prettier-ignore
      skillJsonPath = path.join(projectFolder, 'platforms', 'alexaSkill', 'skill-package', 'skill.json');
      // prettier-ignore
      modelPath = path.join(projectFolder, 'platforms', 'alexaSkill', 'skill-package', 'interactionModels', 'custom', 'en-US.json');
    } else {
      skillJsonPath = path.join(projectFolder, 'platforms', 'alexaSkill', 'skill.json');
      modelPath = path.join(projectFolder, 'platforms', 'alexaSkill', 'models', 'en-US.json');
    }

    expect(existsSync(skillJsonPath)).toBeTruthy();
    const skillJson = JSON.parse(readFileSync(skillJsonPath, 'utf-8'));

    expect(skillJson.manifest.publishingInformation.locales['en-US'].name).toBe(projectName);
    expect(skillJson.manifest.apis.custom.endpoint.uri.substr(0, 27)).toBe(
      'https://webhook.jovo.cloud/',
    );

    expect(existsSync(modelPath)).toBe(true);
    const modelFile = JSON.parse(readFileSync(modelPath, 'utf-8'));

    expect(modelFile.interactionModel.languageModel.invocationName).toBe('my test app');
  }, 12000);

  it('jovo new <project>\n      jovo build --platform googleAction', async () => {
    if (!process.env.ASK_PROFILE) {
      console.log('Skipping because no ask profile found');
      return;
    }

    const projectName = 'helloworld2';

    // Create new project
    const parameters = [projectName, '-t', 'helloworldtest', '--skip-npminstall'];
    await runJovoCommand('new', parameters, tmpTestFolder, 'Installation completed.');

    // Build project
    const projectFolder = path.join(tmpTestFolder, projectName);
    await runJovoCommand(
      'build',
      ['--platform', 'googleAction'],
      projectFolder,
      'Build completed.',
    );

    expect(existsSync(path.join(projectFolder, 'platforms'))).toBe(true);
    expect(existsSync(path.join(projectFolder, 'platforms', 'googleAction'))).toBe(true);
    expect(existsSync(path.join(projectFolder, 'platforms', 'googleAction', 'dialogflow'))).toBe(
      true,
    );

    expect(
      existsSync(path.join(projectFolder, 'platforms', 'googleAction', 'dialogflow', 'agent.json')),
    ).toBe(true);
    const agentJson = JSON.parse(
      readFileSync(
        path.join(projectFolder, 'platforms', 'googleAction', 'dialogflow', 'agent.json'),
        'utf-8',
      ),
    );

    expect(agentJson.webhook.url.substr(0, 27)).toBe('https://webhook.jovo.cloud/');

    expect(
      existsSync(path.join(projectFolder, 'platforms', 'googleAction', 'dialogflow', 'intents')),
    ).toBe(true);

    expect(
      existsSync(
        path.join(
          projectFolder,
          'platforms',
          'googleAction',
          'dialogflow',
          'intents',
          'Default Fallback Intent.json',
        ),
      ),
    ).toBe(true);

    expect(
      existsSync(
        path.join(
          projectFolder,
          'platforms',
          'googleAction',
          'dialogflow',
          'intents',
          'Default Welcome Intent.json',
        ),
      ),
    ).toBe(true);

    expect(
      existsSync(
        path.join(
          projectFolder,
          'platforms',
          'googleAction',
          'dialogflow',
          'intents',
          'HelloWorldIntent.json',
        ),
      ),
    ).toBe(true);

    expect(
      existsSync(
        path.join(
          projectFolder,
          'platforms',
          'googleAction',
          'dialogflow',
          'intents',
          'HelloWorldIntent_usersays_en.json',
        ),
      ),
    ).toBe(true);

    expect(
      existsSync(
        path.join(
          projectFolder,
          'platforms',
          'googleAction',
          'dialogflow',
          'intents',
          'MyNameIsIntent.json',
        ),
      ),
    ).toBe(true);

    expect(
      existsSync(
        path.join(
          projectFolder,
          'platforms',
          'googleAction',
          'dialogflow',
          'intents',
          'MyNameIsIntent_usersays_en.json',
        ),
      ),
    ).toBe(true);
  }, 12000);

  it('jovo new <project> --build \n      jovo build --platform alexaSkill --reverse --force', async () => {
    if (!process.env.ASK_PROFILE) {
      console.log('Skipping because no ask profile found');
      return;
    }

    const projectName = 'helloworld_reverse_alexaSkill';

    // Create new project
    const parameters = [
      projectName,
      '-t',
      'helloworldtest',
      '--build',
      'alexaSkill',
      '--skip-npminstall',
    ];
    await runJovoCommand('new', parameters, tmpTestFolder, 'Installation completed.');

    const projectFolder = path.join(tmpTestFolder, projectName);

    // Build project
    await runJovoCommand(
      'build',
      ['--platform', 'alexaSkill', '--reverse', '--force'],
      projectFolder,
      'Build completed.',
    );

    expect(existsSync(path.join(projectFolder, 'models', 'en-US.json'))).toBe(true);

    const modelJson = JSON.parse(
      readFileSync(path.join(projectFolder, 'models', 'en-US.json'), 'utf-8'),
    );
    expect(modelJson.invocation).toBe('my test app');
  }, 12000);

  it('jovo new <project> --build \n      jovo build --platform googleAction --reverse --force', async () => {
    if (!process.env.ASK_PROFILE) {
      console.log('Skipping because no ask profile found');
      return;
    }

    const projectName = 'helloworld_reverse_googleAction';

    // Create new project
    const parameters = [
      projectName,
      '-t',
      'helloworldtest',
      '--build',
      'googleAction',
      '--skip-npminstall',
    ];
    await runJovoCommand('new', parameters, tmpTestFolder, 'Installation completed.');

    const projectFolder = path.join(tmpTestFolder, projectName);

    // Build project
    await runJovoCommand(
      'build',
      ['--platform', 'googleAction', '--reverse', '--force'],
      projectFolder,
      'Build completed.',
    );

    expect(existsSync(path.join(projectFolder, 'models', 'en.json'))).toBe(true);

    const modelJson = JSON.parse(
      readFileSync(path.join(projectFolder, 'models', 'en.json'), 'utf-8'),
    );
    expect(modelJson.invocation.length === 0).toBe(true);
  }, 12000);
});
