import fs from 'fs';
import tv4 from 'tv4';
import { JovoModelData } from 'jovo-model';
import { join as joinPaths, resolve } from 'path';
import { Config, deleteFolderRecursive, JovoCliPlugin, Project } from '../src';
import { CommandPlugin } from './__mocks__/plugins/CommandPlugin';

jest.mock('fs', () => ({ ...Object.assign({}, jest.requireActual('fs')) }));
jest.spyOn(Config.prototype, 'getContent').mockReturnThis();
jest.spyOn(Config.prototype, 'get').mockReturnThis();
jest.spyOn(Config, 'getInstance').mockReturnValue(new Config(''));

const testPath: string = resolve(joinPaths('test', 'tmpTestFolderProject'));

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
    const mocked: jest.SpyInstance = jest
      .spyOn(Config.prototype, 'getParameter')
      .mockReturnValue(undefined);

    const project: Project = new Project('testPath');
    expect(project['projectPath']).toMatch('testPath');
    expect(project.$config).toBeDefined();
    expect(project.$stage).toBeUndefined();

    mocked.mockRestore();
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
    const mocked: jest.SpyInstance = jest
      .spyOn(Config.prototype, 'getParameter')
      .mockReturnValue('dev');

    const project: Project = new Project('');
    expect(project.$stage).toBeDefined();
    expect(project.$stage).toMatch('dev');

    mocked.mockRestore();
  });
});

describe('getBuildDirectory()', () => {
  test('should return default directory "build/"', () => {
    const mocked: jest.SpyInstance = jest
      .spyOn(Config.prototype, 'getParameter')
      .mockReturnValue(undefined);

    const project: Project = new Project('');
    expect(project.getBuildDirectory()).toMatch('build');

    mocked.mockRestore();
  });

  test('should return configured directory from project configuration', () => {
    const mocked: jest.SpyInstance = jest
      .spyOn(Config.prototype, 'getParameter')
      .mockReturnValueOnce(undefined)
      .mockReturnValue('modifiedBuildDirectory');

    const project: Project = new Project('');
    expect(project.getBuildDirectory()).toMatch('modifiedBuildDirectory');

    mocked.mockRestore();
  });
});

describe('getBuildPath()', () => {
  test('should return build path', () => {
    const mocked = jest.spyOn(Project.prototype, 'getBuildDirectory').mockReturnValue('build');

    const project: Project = new Project('test');
    expect(project.getBuildPath()).toMatch(joinPaths('test', 'build'));

    mocked.mockRestore();
  });
});

describe('getModelsDirectory()', () => {
  test('should return default directory "models/"', () => {
    const mocked: jest.SpyInstance = jest
      .spyOn(Config.prototype, 'getParameter')
      .mockReturnValue(undefined);

    const project: Project = new Project('');
    expect(project.getModelsDirectory()).toMatch('models');

    mocked.mockRestore();
  });

  test('should return configured directory from project configuration', () => {
    const mocked: jest.SpyInstance = jest
      .spyOn(Config.prototype, 'getParameter')
      .mockReturnValueOnce(undefined)
      .mockReturnValue('modifiedModelsDirectory');

    const project: Project = new Project('');
    expect(project.getModelsDirectory()).toMatch('modifiedModelsDirectory');

    mocked.mockRestore();
  });
});

describe('getModelsPath()', () => {
  test('should return models path', () => {
    const mocked: jest.SpyInstance = jest
      .spyOn(Project.prototype, 'getModelsDirectory')
      .mockReturnValue('models');

    const project: Project = new Project('test');
    expect(project.getModelsPath()).toMatch(joinPaths('test', 'models'));

    mocked.mockRestore();
  });
});

describe('getModelPath()', () => {
  test('should return model path for the provided locale', () => {
    const mocked: jest.SpyInstance = jest
      .spyOn(Project.prototype, 'getModelsPath')
      .mockReturnValue('models');

    const project: Project = new Project('');
    expect(project.getModelPath('en')).toMatch(joinPaths('models', 'en'));

    mocked.mockRestore();
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
    const mocked: jest.SpyInstance = jest
      .spyOn(Project.prototype, 'getModelPath')
      .mockReturnValue('invalid');

    const project: Project = new Project('');
    expect(project.getModel.bind(project, 'en')).toThrow(
      'Could not find model file for locale: en',
    );

    mocked.mockRestore();
  });

  test('should throw an error if something else went wrong', () => {
    const mocked: jest.SpyInstance = jest
      .spyOn(Project.prototype, 'getModelPath')
      .mockReturnValue(joinPaths(testPath, 'en'));

    fs.writeFileSync(joinPaths(testPath, 'en.json'), '{');

    const project: Project = new Project('');
    expect(project.getModel.bind(project, 'en')).toThrow();

    mocked.mockRestore();
  });

  test('should return model', () => {
    const mocked: jest.SpyInstance = jest
      .spyOn(Project.prototype, 'getModelPath')
      .mockReturnValue(joinPaths(testPath, 'de'));

    const testModel: JovoModelData = {
      invocation: 'test',
    };

    fs.writeFileSync(joinPaths(testPath, 'de.json'), JSON.stringify(testModel));

    const project: Project = new Project('');
    const projectModel: JovoModelData = project.getModel('de');
    expect(projectModel).toBeDefined();
    expect(projectModel).toHaveProperty('invocation');
    expect(projectModel.invocation).toMatch('test');

    mocked.mockRestore();
  });
});

describe('hasModelFiles()', () => {
  test('should return false if no locales are provided', () => {
    const project: Project = new Project('');
    expect(project.hasModelFiles()).toBeFalsy();
  });

  test('should return false if requiring a model went wrong', () => {
    const mocked: jest.SpyInstance = jest
      .spyOn(Project.prototype, 'getModel')
      .mockImplementation(() => {
        throw new Error();
      });

    const project: Project = new Project('');
    expect(project.hasModelFiles(['en'])).toBeFalsy();

    mocked.mockRestore();
  });

  test('should return true if all models could be loaded', () => {
    const mocked: jest.SpyInstance = jest.spyOn(Project.prototype, 'getModel').mockReturnThis();

    const project: Project = new Project('');
    expect(project.hasModelFiles(['en'])).toBeTruthy();

    mocked.mockRestore();
  });
});

describe('validateModel()', () => {
  test('should throw a ModelValidationError if model is not valid', () => {
    const mocked: jest.SpyInstance = jest.spyOn(Project.prototype, 'getModel').mockReturnThis();
    tv4.validate = jest.fn().mockReturnValueOnce(false);
    // @ts-ignore
    tv4.error = { message: 'Validation failed.' };

    const project: Project = new Project('');
    expect(project.validateModel.bind(project, 'en', {})).toThrow('Validation failed.');

    mocked.mockRestore();
  });

  test('should do nothing if model is valid', () => {
    const mocked: jest.SpyInstance = jest.spyOn(Project.prototype, 'getModel').mockReturnThis();
    tv4.validate = jest.fn().mockReturnValueOnce(true);

    const project: Project = new Project('');
    project.validateModel('en', {});

    mocked.mockRestore();
  });
});

describe('backupModel()', () => {
  test('should throw an error if model file for the provided locale cannot be found', () => {
    const mocked: jest.SpyInstance = jest
      .spyOn(Project.prototype, 'hasModelFiles')
      .mockReturnValue(false);

    const project: Project = new Project('');
    expect(project.backupModel.bind(project, 'en')).toThrow(
      'Model file for locale en to backup could not be found.',
    );

    mocked.mockRestore();
  });

  test('should copy the model for .js files', () => {
    const mockedHasModelFiles: jest.SpyInstance = jest
      .spyOn(Project.prototype, 'hasModelFiles')
      .mockReturnValue(true);
    const mockedGetModelPath: jest.SpyInstance = jest
      .spyOn(Project.prototype, 'getModelPath')
      .mockReturnValue(joinPaths('models', 'en'));
    const mockedExistsSync: jest.SpyInstance = jest
      .spyOn(fs, 'existsSync')
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);
    const mockedCopyFileSync: jest.SpyInstance = jest.spyOn(fs, 'copyFileSync').mockReturnThis();

    const project: Project = new Project('');
    project.backupModel('en');
    const dateString: string = new Date().toISOString().substring(0, 10);

    expect(fs.existsSync).toBeCalledTimes(2);
    expect(fs.copyFileSync).toBeCalledTimes(1);
    expect(fs.copyFileSync).toBeCalledWith(
      joinPaths('models', 'en.js'),
      joinPaths('models', `en.${dateString}.js`),
    );

    mockedHasModelFiles.mockRestore();
    mockedGetModelPath.mockRestore();
    mockedExistsSync.mockRestore();
    mockedCopyFileSync.mockRestore();
  });

  test('should copy the model for .json files', () => {
    const mockedHasModelFiles: jest.SpyInstance = jest
      .spyOn(Project.prototype, 'hasModelFiles')
      .mockReturnValue(true);
    const mockedGetModelPath: jest.SpyInstance = jest
      .spyOn(Project.prototype, 'getModelPath')
      .mockReturnValue(joinPaths('models', 'en'));
    const mockedExistsSync: jest.SpyInstance = jest
      .spyOn(fs, 'existsSync')
      .mockReturnValueOnce(true);
    const mockedCopyFileSync: jest.SpyInstance = jest.spyOn(fs, 'copyFileSync').mockReturnThis();

    const project: Project = new Project('');
    project.backupModel('en');
    const dateString: string = new Date().toISOString().substring(0, 10);

    expect(fs.existsSync).toBeCalledTimes(2);
    expect(fs.copyFileSync).toBeCalledTimes(1);
    expect(fs.copyFileSync).toBeCalledWith(
      joinPaths('models', 'en.json'),
      joinPaths('models', `en.${dateString}.json`),
    );

    mockedHasModelFiles.mockRestore();
    mockedGetModelPath.mockRestore();
    mockedExistsSync.mockRestore();
    mockedCopyFileSync.mockRestore();
  });
});

describe('saveModel()', () => {
  test('should create the models folder if it does not exist already', () => {
    const mockedGetModelsPath: jest.SpyInstance = jest
      .spyOn(Project.prototype, 'getModelsPath')
      .mockReturnValue('models');
    const mockedGetModelPath: jest.SpyInstance = jest
      .spyOn(Project.prototype, 'getModelPath')
      .mockReturnValue(joinPaths('models', 'en'));
    const mockedExistsSync: jest.SpyInstance = jest
      .spyOn(fs, 'existsSync')
      .mockReturnValueOnce(false);
    const mockedMkdirSync: jest.SpyInstance = jest.spyOn(fs, 'mkdirSync').mockReturnThis();
    const mockedWriteFileSync: jest.SpyInstance = jest.spyOn(fs, 'writeFileSync').mockReturnThis();

    const project: Project = new Project('');
    const model: JovoModelData = { invocation: 'test' };
    project.saveModel(model, 'en');

    expect(fs.existsSync).toBeCalledWith('models');
    expect(fs.mkdirSync).toBeCalledTimes(1);
    expect(fs.mkdirSync).toBeCalledWith('models');
    expect(mockedGetModelPath).toBeCalledWith('en');
    expect(fs.writeFileSync).toBeCalledWith(
      joinPaths('models', 'en.json'),
      JSON.stringify(model, null, 2),
    );

    mockedGetModelsPath.mockRestore();
    mockedGetModelPath.mockRestore();
    mockedExistsSync.mockRestore();
    mockedMkdirSync.mockRestore();
    mockedWriteFileSync.mockRestore();
  });
});

describe('getLocales()', () => {
  test('should return default locale if models directory does not exist', () => {
    const mockedExistsSync: jest.SpyInstance = jest.spyOn(fs, 'existsSync').mockReturnValue(false);

    const project: Project = new Project('');
    const locales: string[] = project.getLocales();
    expect(locales).toHaveLength(1);
    expect(locales[0]).toMatch('en');

    mockedExistsSync.mockRestore();
  });

  test('should return default locale if no files can be found', () => {
    const mockedExistsSync: jest.SpyInstance = jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    const mockedReaddirSync: jest.SpyInstance = jest.spyOn(fs, 'readdirSync').mockReturnValue([]);

    const project: Project = new Project('');
    const locales: string[] = project.getLocales();
    expect(locales).toHaveLength(1);
    expect(locales[0]).toMatch('en');

    mockedExistsSync.mockRestore();
    mockedReaddirSync.mockRestore();
  });

  test('should only return valid locales', () => {
    const mockedExistsSync: jest.SpyInstance = jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    const mockedReaddirSync: jest.SpyInstance = jest
      .spyOn(fs, 'readdirSync')
      // @ts-ignore
      .mockReturnValue(['en.json', 'de.js', 'invalid_locale.json']);

    const project: Project = new Project('');
    const locales: string[] = project.getLocales();
    expect(locales).toHaveLength(2);
    expect(locales[1]).toMatch('de');

    mockedExistsSync.mockRestore();
    mockedReaddirSync.mockRestore();
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
    const mocked: jest.SpyInstance = jest
      .spyOn(Project.prototype, 'getBuildPath')
      .mockReturnValue(joinPaths(testPath, 'build'));

    const project: Project = new Project('');
    expect(project.hasPlatform('platform.alexa')).toBeTruthy();

    mocked.mockRestore();
    deleteFolderRecursive(testPath);
  });

  test('should return false if platform folder does not exist', () => {
    const mocked: jest.SpyInstance = jest
      .spyOn(Project.prototype, 'getBuildPath')
      .mockReturnValue(joinPaths(testPath, 'build'));

    const project: Project = new Project('');
    expect(project.hasPlatform('platform.alexa')).toBeFalsy();

    mocked.mockRestore();
  });
});

describe('isTypeScriptProject()', () => {
  test('should return false if typescript is not a devDependency', () => {
    const mockedReadFileSync: jest.SpyInstance = jest
      .spyOn(fs, 'readFileSync')
      .mockReturnValue('{"devDependencies": {} }');

    const project: Project = new Project('');
    expect(project.isTypeScriptProject()).toBeFalsy();

    mockedReadFileSync.mockRestore();
  });

  test('should return true if typescript is a devDependency', () => {
    const mockedReadFileSync: jest.SpyInstance = jest
      .spyOn(fs, 'readFileSync')
      .mockReturnValue('{"devDependencies": { "typescript": "^1.0.0" } }');

    const project: Project = new Project('');
    expect(project.isTypeScriptProject()).toBeTruthy();

    mockedReadFileSync.mockRestore();
  });
});

describe('collectPlugins()', () => {
  test('should return an empty array if no plugins could be found', () => {
    const mocked: jest.SpyInstance = jest
      .spyOn(Config.prototype, 'getParameter')
      .mockReturnValue([]);

    const project: Project = new Project('');
    const plugins: JovoCliPlugin[] = project.collectPlugins();

    expect(plugins).toHaveLength(0);

    mocked.mockRestore();
  });

  test('should merge and return plugins', () => {
    // Load mocked plugins.
    const plugin: CommandPlugin = new CommandPlugin({ files: { foo: 'bar' } });

    const mocked: jest.SpyInstance = jest
      .spyOn(Config.prototype, 'getParameter')
      .mockReturnValue([plugin]);

    const project: Project = new Project('');
    const plugins: JovoCliPlugin[] = project.collectPlugins();

    expect(plugins).toHaveLength(1);
    expect(plugins[0]).toHaveProperty('config');
    expect(plugins[0].config).toHaveProperty('files');
    expect(plugins[0].config.files).toHaveProperty('foo');
    expect(plugins[0].config.files.foo).toMatch('bar');
    expect(plugins[0].id).toMatch('commandPlugin');

    mocked.mockRestore();
  });
});
