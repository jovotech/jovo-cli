import fs from 'fs';
import tv4 from 'tv4';
import { JovoModelData, JovoModelDataV3 } from '@jovotech/model';
import { join as joinPaths, resolve } from 'path';
import { Config, deleteFolderRecursive, JovoCliPlugin, Project } from '../src';
import { Plugin } from './__mocks__/plugins/Plugin';

jest.mock('fs', () => ({ ...Object.assign({}, jest.requireActual('fs')) }));

const testPath: string = resolve(joinPaths('test', 'tmpTestFolderProject'));

beforeEach(() => {
  jest.spyOn(Config.prototype, 'getContent').mockReturnThis();
  jest.spyOn(Config.prototype, 'get').mockReturnThis();
  jest.spyOn(Config, 'getInstance').mockReturnValue(new Config(''));
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('Project.getInstance()', () => {
  beforeEach(() => {
    delete Project['instance'];
  });

  test('should return instance of Project', () => {
    expect(Project['instance']).toBeUndefined();
    const project: Project = Project.getInstance('');

    expect(project).toBeDefined();
    expect(Project['instance']).toBeDefined();
    expect(project === Project['instance']).toBeTruthy();
  });

  test('should not return instance of Project if one exists already', () => {
    expect(Project['instance']).toBeUndefined();
    const project1: Project = Project.getInstance('');
    expect(Project['instance']).toBeDefined();

    const project2: Project = Project.getInstance('');
    expect(project1 === project2).toBeTruthy();
  });
});

describe('new Project()', () => {
  test('should instantiate project with project path, config and undefined stage', () => {
    delete process.env.NODE_ENV;
    jest.spyOn(Config.prototype, 'getParameter').mockReturnValue(undefined);

    const project: Project = new Project('testPath');
    expect(project['projectPath']).toMatch('testPath');
    expect(project.$config).toBeDefined();
    expect(project.$stage).toBeUndefined();
  });

  test('should get the stage from command arguments', () => {
    process.argv.push('--stage', 'dev');
    const project: Project = new Project('');
    expect(project.$stage).toBeDefined();
    expect(project.$stage).toMatch('dev');
    // Remove stage argument.
    process.argv.splice(-2);
  });

  test('should get the stage from process.env.JOVO_STAGE', () => {
    process.env.JOVO_STAGE = 'dev';
    const project: Project = new Project('');
    expect(project.$stage).toBeDefined();
    expect(project.$stage).toMatch('dev');
    delete process.env.JOVO_STAGE;
  });

  test('should get the stage from process.env.NODE_ENV', () => {
    process.env.NODE_ENV = 'dev';
    const project: Project = new Project('');
    expect(project.$stage).toBeDefined();
    expect(project.$stage).toMatch('dev');
    delete process.env.NODE_ENV;
  });

  test('should get the stage from config', () => {
    jest.spyOn(Config.prototype, 'getParameter').mockReturnValue('dev');

    const project: Project = new Project('');
    expect(project.$stage).toBeDefined();
    expect(project.$stage).toMatch('dev');
  });
});

describe('getBuildDirectory()', () => {
  test('should return default directory "build/"', () => {
    jest.spyOn(Config.prototype, 'getParameter').mockReturnValue(undefined);

    const project: Project = new Project('');
    expect(project.getBuildDirectory()).toMatch('build');
  });

  test('should return configured directory from project configuration', () => {
    jest
      .spyOn(Config.prototype, 'getParameter')
      .mockReturnValueOnce(undefined)
      .mockReturnValue('modifiedBuildDirectory');

    const project: Project = new Project('');
    expect(project.getBuildDirectory()).toMatch('modifiedBuildDirectory');
  });

  test('should return staged build directory', () => {
    jest
      .spyOn(Config.prototype, 'getParameter')
      .mockReturnValueOnce('dev')
      .mockReturnValue(undefined);

    const project: Project = new Project('');
    expect(project.getBuildDirectory()).toMatch('build/dev');
  });
});

describe('getBuildPath()', () => {
  test('should return build path', () => {
    jest.spyOn(Project.prototype, 'getBuildDirectory').mockReturnValue('build');

    const project: Project = new Project('test');
    expect(project.getBuildPath()).toMatch(joinPaths('test', 'build'));
  });
});

describe('getModelsDirectory()', () => {
  test('should return default directory "models/"', () => {
    jest.spyOn(Config.prototype, 'getParameter').mockReturnValue(undefined);

    const project: Project = new Project('');
    expect(project.getModelsDirectory()).toMatch('models');
  });

  test('should return configured directory from project configuration', () => {
    jest
      .spyOn(Config.prototype, 'getParameter')
      .mockReturnValueOnce(undefined)
      .mockReturnValue('modifiedModelsDirectory');

    const project: Project = new Project('');
    expect(project.getModelsDirectory()).toMatch('modifiedModelsDirectory');
  });
});

describe('getModelsPath()', () => {
  test('should return models path', () => {
    jest.spyOn(Project.prototype, 'getModelsDirectory').mockReturnValue('models');

    const project: Project = new Project('test');
    expect(project.getModelsPath()).toMatch(joinPaths('test', 'models'));
  });
});

describe('getModelPath()', () => {
  test('should return model path for the provided locale', () => {
    jest.spyOn(Project.prototype, 'getModelsPath').mockReturnValue('models');

    const project: Project = new Project('');
    expect(project.getModelPath('en')).toMatch(joinPaths('models', 'en'));
  });
});

describe('getModel()', () => {
  beforeEach(() => {
    fs.mkdirSync(testPath, { recursive: true });
  });

  afterEach(() => {
    deleteFolderRecursive(testPath);
  });

  test('should throw an error if module cannot be found', () => {
    jest.spyOn(Project.prototype, 'getModelPath').mockReturnValue('invalid');

    const project: Project = new Project('');
    return expect(project.getModel('en')).rejects.toEqual(
      new Error('Could not find model file for locale: en'),
    );
  });

  test('should throw an error if something else went wrong', () => {
    jest.spyOn(Project.prototype, 'getModelPath').mockReturnValue(joinPaths(testPath, 'en'));

    fs.writeFileSync(joinPaths(testPath, 'en.json'), '{');

    const project: Project = new Project('');
    return expect(project.getModel('en')).rejects.toEqual(new Error());
  });

  test('should return model', async () => {
    jest.spyOn(Project.prototype, 'getModelPath').mockReturnValue(joinPaths(testPath, 'de'));

    const testModel: JovoModelData = {
      version: '4.0',
      invocation: 'test',
    };

    fs.writeFileSync(joinPaths(testPath, 'de.json'), JSON.stringify(testModel));

    const project: Project = new Project('');
    const projectModel: JovoModelData | JovoModelDataV3 = await project.getModel('de');
    expect(projectModel).toBeDefined();
    expect(projectModel).toHaveProperty('invocation');
    expect(projectModel.invocation).toMatch('test');
  });
});

describe('hasModelFiles()', () => {
  test('should return false if no locales are provided', () => {
    const project: Project = new Project('');
    expect(project.hasModelFiles()).toBeFalsy();
  });

  test('should return false if requiring a model went wrong', () => {
    jest.spyOn(Project.prototype, 'getModel').mockImplementation(() => {
      throw new Error();
    });

    const project: Project = new Project('');
    expect(project.hasModelFiles(['en'])).toBeFalsy();
  });

  test('should return true if all models could be loaded', () => {
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);

    const project: Project = new Project('');
    expect(project.hasModelFiles(['en'])).toBeTruthy();
  });
});

describe('validateModel()', () => {
  test('should throw a ModelValidationError if model is not valid', async () => {
    jest.spyOn(Project.prototype, 'getModel').mockReturnThis();
    tv4.validate = jest.fn().mockReturnValueOnce(false);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    tv4.error = { message: 'Validation failed' };

    const project: Project = new Project('');

    await expect(project.validateModel('en', { invocation: 'test' }, {})).rejects.toEqual(
      new Error('Validation failed for locale "en"'),
    );
  });

  test('should do nothing if model is valid', async () => {
    jest.spyOn(Project.prototype, 'getModel').mockReturnThis();
    tv4.validate = jest.fn().mockReturnValueOnce(true);

    const project: Project = new Project('');
    await project.validateModel('en', { invocation: 'test' }, {});
  });
});

describe('backupModel()', () => {
  test('should throw an error if model file for the provided locale cannot be found', () => {
    jest.spyOn(Project.prototype, 'hasModelFiles').mockReturnValue(false);

    const project: Project = new Project('');
    expect(project.backupModel.bind(project, 'en')).toThrow(
      'Model file for locale en to backup could not be found.',
    );
  });

  test('should copy the model for .js files', () => {
    jest.spyOn(Project.prototype, 'hasModelFiles').mockReturnValue(true);
    jest.spyOn(Project.prototype, 'getModelPath').mockReturnValue(joinPaths('models', 'en'));
    jest.spyOn(fs, 'existsSync').mockReturnValueOnce(false).mockReturnValueOnce(true);
    jest.spyOn(fs, 'copyFileSync').mockReturnThis();

    const project: Project = new Project('');
    project.backupModel('en');
    const dateString: string = new Date().toISOString().substring(0, 10);

    expect(fs.existsSync).toBeCalledTimes(2);
    expect(fs.copyFileSync).toBeCalledTimes(1);
    expect(fs.copyFileSync).toBeCalledWith(
      joinPaths('models', 'en.js'),
      joinPaths('models', `en.${dateString}.js`),
    );
  });

  test('should copy the model for .json files', () => {
    jest.spyOn(Project.prototype, 'hasModelFiles').mockReturnValue(true);
    jest.spyOn(Project.prototype, 'getModelPath').mockReturnValue(joinPaths('models', 'en'));
    jest.spyOn(fs, 'existsSync').mockReturnValueOnce(true);
    jest.spyOn(fs, 'copyFileSync').mockReturnThis();

    const project: Project = new Project('');
    project.backupModel('en');
    const dateString: string = new Date().toISOString().substring(0, 10);

    expect(fs.existsSync).toBeCalledTimes(2);
    expect(fs.copyFileSync).toBeCalledTimes(1);
    expect(fs.copyFileSync).toBeCalledWith(
      joinPaths('models', 'en.json'),
      joinPaths('models', `en.${dateString}.json`),
    );
  });
});

describe('saveModel()', () => {
  test('should create the models folder if it does not exist already', () => {
    jest.spyOn(Project.prototype, 'getModelsPath').mockReturnValue('models');

    jest.spyOn(fs, 'existsSync').mockReturnValueOnce(false);
    jest.spyOn(fs, 'mkdirSync').mockReturnThis();
    jest.spyOn(fs, 'writeFileSync').mockReturnThis();
    const mockedGetModelPath: jest.SpyInstance = jest
      .spyOn(Project.prototype, 'getModelPath')
      .mockReturnValue(joinPaths('models', 'en'));

    const project: Project = new Project('');
    const model: JovoModelData = { version: '4.0', invocation: 'test' };
    project.saveModel(model, 'en');

    expect(fs.existsSync).toBeCalledWith('models');
    expect(fs.mkdirSync).toBeCalledTimes(1);
    expect(fs.mkdirSync).toBeCalledWith('models');
    expect(mockedGetModelPath).toBeCalledWith('en');
    expect(fs.writeFileSync).toBeCalledWith(
      joinPaths('models', 'en.json'),
      JSON.stringify(model, null, 2),
    );

    mockedGetModelPath.mockRestore();
  });
});

describe('getLocales()', () => {
  test('should return default locale if models directory does not exist', () => {
    jest.spyOn(fs, 'existsSync').mockReturnValue(false);

    const project: Project = new Project('');
    const locales: string[] = project.getLocales();
    expect(locales).toHaveLength(1);
    expect(locales[0]).toMatch('en');
  });

  test('should return default locale if no files can be found', () => {
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    jest.spyOn(fs, 'readdirSync').mockReturnValue([]);

    const project: Project = new Project('');
    const locales: string[] = project.getLocales();
    expect(locales).toHaveLength(1);
    expect(locales[0]).toMatch('en');
  });

  test('should only return valid locales', () => {
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    jest
      .spyOn(fs, 'readdirSync')
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      .mockReturnValue(['en.json', 'de.js', 'invalid_locale.json']);

    const project: Project = new Project('');
    const locales: string[] = project.getLocales();
    expect(locales).toHaveLength(2);
    expect(locales[1]).toMatch('de');
  });
});

describe('getProjectName()', () => {
  test('should return project name', () => {
    const project: Project = new Project(joinPaths('test', 'projectName'));
    expect(project.getProjectName()).toMatch('projectName');
  });
});

describe('hasPlatform()', () => {
  test('should return true if platform folder exists', () => {
    fs.mkdirSync(joinPaths(testPath, 'build', 'platform.alexa'), { recursive: true });
    jest.spyOn(Project.prototype, 'getBuildPath').mockReturnValue(joinPaths(testPath, 'build'));

    const project: Project = new Project('');
    expect(project.hasPlatform('platform.alexa')).toBeTruthy();

    deleteFolderRecursive(testPath);
  });

  test('should return false if platform folder does not exist', () => {
    jest.spyOn(Project.prototype, 'getBuildPath').mockReturnValue(joinPaths(testPath, 'build'));

    const project: Project = new Project('');
    expect(project.hasPlatform('platform.alexa')).toBeFalsy();
  });
});

describe('isTypeScriptProject()', () => {
  test('should return false if typescript is not a devDependency', () => {
    jest.spyOn(fs, 'readFileSync').mockReturnValue('{"devDependencies": {} }');

    const project: Project = new Project('');
    expect(project.isTypeScriptProject()).toBeFalsy();
  });

  test('should return true if typescript is a devDependency', () => {
    jest
      .spyOn(fs, 'readFileSync')
      .mockReturnValue('{"devDependencies": { "typescript": "^1.0.0" } }');

    const project: Project = new Project('');
    expect(project.isTypeScriptProject()).toBeTruthy();
  });
});

describe('collectPlugins()', () => {
  test('should return an empty array if no plugins could be found', () => {
    jest.spyOn(Config.prototype, 'getParameter').mockReturnValue([]);

    const project: Project = new Project('');
    const plugins: JovoCliPlugin[] = project.collectPlugins();

    expect(plugins).toHaveLength(0);
  });

  test('should merge and return plugins', () => {
    // Load mocked plugins.
    const plugin: Plugin = new Plugin({ files: { foo: 'bar' } });

    jest.spyOn(Config.prototype, 'getParameter').mockReturnValue([plugin]);

    const project: Project = new Project('');
    const plugins: JovoCliPlugin[] = project.collectPlugins();

    expect(plugins).toHaveLength(1);
    expect(plugins[0]).toHaveProperty('$config');
    expect(plugins[0].$config).toHaveProperty('files');
    expect(plugins[0].$config.files).toHaveProperty('foo');
    expect(plugins[0].$config.files!.foo).toMatch('bar');
    expect(plugins[0].$id).toMatch('commandPlugin');
  });
});
