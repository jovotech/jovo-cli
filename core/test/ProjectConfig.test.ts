import { join as joinPaths, resolve } from 'path';
import { ProjectConfig } from '../src';
import { Plugin } from './__mocks__/plugins/Plugin';

afterEach(() => {
  jest.restoreAllMocks();
});

describe('new ProjectConfig()', () => {
  test('should accept a config object and assign it to the current instance', () => {
    const endpoint: string = 'https://test.com';
    const config: ProjectConfig = new ProjectConfig({ endpoint });
    expect(config.endpoint).toBeDefined();
    expect(config.endpoint).toMatch(endpoint);
  });

  test('should accept a path and load the config accordingly', () => {
    const endpoint: string = 'https://test.com';
    const mockedLoadContent: jest.SpyInstance = jest
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .spyOn(ProjectConfig.prototype as any, 'loadContent')
      .mockReturnThis();
    const mockedLoad: jest.SpyInstance = jest
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .spyOn(ProjectConfig.prototype as any, 'load')
      .mockReturnValue({ endpoint });

    const path: string = '/path/to/config';
    const stage: string = 'dev';
    const config: ProjectConfig = new ProjectConfig(path, stage);

    expect(mockedLoadContent).toBeCalledTimes(1);
    expect(mockedLoadContent).toBeCalledWith(path);
    expect(mockedLoad).toBeCalledTimes(1);
    expect(mockedLoad).toBeCalledWith(path, stage);
    expect(config.endpoint).toBeDefined();
    expect(config.endpoint).toMatch(endpoint);
  });

  test('should accept a path and load the config accordingly, with a defaultStage', () => {
    const endpoint: string = 'https://test.com';
    const mockedLoadContent: jest.SpyInstance = jest
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .spyOn(ProjectConfig.prototype as any, 'loadContent')
      .mockReturnValue({ defaultStage: 'prod' });
    const mockedLoad: jest.SpyInstance = jest
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .spyOn(ProjectConfig.prototype as any, 'load')
      .mockReturnValue({ endpoint });

    const path: string = '/path/to/config';
    const config: ProjectConfig = new ProjectConfig(path);

    expect(mockedLoadContent).toBeCalledTimes(1);
    expect(mockedLoadContent).toBeCalledWith(path);
    expect(mockedLoad).toBeCalledTimes(1);
    expect(mockedLoad).toBeCalledWith(path, 'prod');
    expect(config.endpoint).toBeDefined();
    expect(config.endpoint).toMatch(endpoint);
  });
});

describe('ProjectConfig.getInstance()', () => {
  beforeEach(() => {
    delete ProjectConfig['instance'];
  });

  test('should return instance of ProjectConfig', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jest.spyOn(ProjectConfig.prototype as any, 'loadContent').mockReturnThis();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jest.spyOn(ProjectConfig.prototype as any, 'load').mockReturnThis();

    expect(ProjectConfig['instance']).toBeUndefined();
    const config: ProjectConfig = ProjectConfig.getInstance('');

    expect(config).toBeDefined();
    expect(ProjectConfig['instance']).toBeDefined();
    expect(config === ProjectConfig['instance']).toBeTruthy();
  });

  test('should not return instance of ProjectConfig if one exists already', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jest.spyOn(ProjectConfig.prototype as any, 'loadContent').mockReturnThis();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jest.spyOn(ProjectConfig.prototype as any, 'load').mockReturnThis();

    expect(ProjectConfig['instance']).toBeUndefined();
    const config1: ProjectConfig = ProjectConfig.getInstance('');
    expect(ProjectConfig['instance']).toBeDefined();

    const config2: ProjectConfig = ProjectConfig.getInstance('');
    expect(config1 === config2).toBeTruthy();
  });
});

describe('new ProjectConfig()', () => {
  test('should load the config', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jest.spyOn(ProjectConfig.prototype as any, 'loadContent').mockReturnThis();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jest.spyOn(ProjectConfig.prototype as any, 'load').mockReturnValue({ endpoint: 'test' });

    const config: ProjectConfig = new ProjectConfig('');

    expect(config.endpoint).toMatch('test');
  });

  test('should load the stage from config if not provided', () => {
    jest
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .spyOn(ProjectConfig.prototype as any, 'loadContent')
      .mockReturnValue({ defaultStage: 'dev' });
    const mockedLoad: jest.SpyInstance = jest
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .spyOn(ProjectConfig.prototype as any, 'load')
      .mockReturnValue({ endpoint: 'test' });

    new ProjectConfig('');

    expect(mockedLoad).toBeCalledTimes(1);
    expect(mockedLoad).toBeCalledWith('', 'dev');
  });

  test('should assign the config provided via constructor parameters to itself', () => {
    const config: ProjectConfig = new ProjectConfig({ endpoint: 'test' });
    expect(config.endpoint).toMatch('test');
  });
});

describe('load()', () => {
  test('should return raw config, if stage is not defined', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jest.spyOn(ProjectConfig.prototype as any, 'loadContent').mockReturnValue({ endpoint: 'test' });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jest.spyOn(ProjectConfig.prototype as any, 'load').mockReturnValueOnce({});

    const config: ProjectConfig = new ProjectConfig('');
    const configContent: ProjectConfig = config['load']('');

    expect(configContent).toBeDefined();
    expect(configContent).toHaveProperty('endpoint');
    expect(configContent.endpoint).toMatch('test');
  });

  test('should return raw config, if no config exists for the provided stage', () => {
    jest
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .spyOn(ProjectConfig.prototype as any, 'loadContent')
      .mockReturnValue({ endpoint: 'test', stages: { dev: { endpoint: 'dev' } } });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jest.spyOn(ProjectConfig.prototype as any, 'load').mockReturnValueOnce({});

    const config: ProjectConfig = new ProjectConfig('');
    const configContent: ProjectConfig = config['load']('prod');

    expect(configContent).toBeDefined();
    expect(configContent).toHaveProperty('endpoint');
    expect(configContent.endpoint).toMatch('test');
    expect(configContent.stages).toBeDefined();
  });

  test('should merge and return the config for the provided stage', () => {
    jest
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .spyOn(ProjectConfig.prototype as any, 'loadContent')
      .mockReturnValue({ endpoint: 'test', stages: { dev: { endpoint: 'dev' } } });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jest.spyOn(ProjectConfig.prototype as any, 'load').mockReturnValueOnce({});

    const config: ProjectConfig = new ProjectConfig('');
    const configContent: ProjectConfig = config['load']('', 'dev');

    expect(configContent).toBeDefined();
    expect(configContent).toHaveProperty('endpoint');
    expect(configContent.endpoint).toMatch('dev');
    expect(configContent.stages).toBeUndefined();
  });

  test('should merge and return the config with merged plugins for the provided stage', () => {
    const stagedPlugin: Plugin = new Plugin({ files: { foo2: 'bar2' } });
    stagedPlugin.id = 'stagedCliPlugin';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jest.spyOn(ProjectConfig.prototype as any, 'loadContent').mockReturnValue({
      plugins: [new Plugin({ files: { foo1: 'bar1' } })],
      stages: {
        dev: {
          plugins: [stagedPlugin],
        },
      },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jest.spyOn(ProjectConfig.prototype as any, 'load').mockReturnValueOnce({});

    const config: ProjectConfig = new ProjectConfig('');
    const configContent: ProjectConfig = config['load']('', 'dev');

    expect(configContent).toBeDefined();
    expect(configContent.stages).toBeUndefined();
    expect(configContent).toHaveProperty('plugins');
    expect(configContent.plugins).toHaveLength(1);
    expect(configContent.plugins![0].id).toMatch('stagedCliPlugin');
    expect(configContent.plugins![0].config.files).toHaveProperty('foo1');
    expect(configContent.plugins![0].config.files!.foo1).toMatch('bar1');
    expect(configContent.plugins![0].config.files).toHaveProperty('foo2');
    expect(configContent.plugins![0].config.files!.foo2).toMatch('bar2');
  });
});

describe('loadContent()', () => {
  test('should return raw config content', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jest.spyOn(ProjectConfig.prototype as any, 'loadContent').mockReturnValueOnce({});
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jest.spyOn(ProjectConfig.prototype as any, 'load').mockReturnThis();

    const config: ProjectConfig = new ProjectConfig('');
    const configContent: ProjectConfig = config['loadContent'](
      resolve(joinPaths('test', '__mocks__')),
    );

    expect(configContent).toBeDefined();
    expect(configContent).toHaveProperty('endpoint');
    expect(configContent.endpoint).toMatch('test');
  });

  test('should throw an error if config cannot be found', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jest.spyOn(ProjectConfig.prototype as any, 'loadContent').mockReturnValueOnce({});
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jest.spyOn(ProjectConfig.prototype as any, 'load').mockReturnThis();

    const config: ProjectConfig = new ProjectConfig('');

    expect(config['loadContent'].bind(config, 'invalid/project/path')).toThrow(
      'Could not load project configuration.',
    );
  });
});

describe('getParameter()', () => {
  test('should return the correct parameter', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jest.spyOn(ProjectConfig.prototype as any, 'loadContent').mockReturnThis();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jest.spyOn(ProjectConfig.prototype as any, 'load').mockReturnThis();

    const config: ProjectConfig = new ProjectConfig('');
    config.endpoint = 'test';
    expect(config.getParameter('endpoint')).toMatch('test');
  });

  test('should return undefined if the paramater does not exist', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jest.spyOn(ProjectConfig.prototype as any, 'loadContent').mockReturnThis();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jest.spyOn(ProjectConfig.prototype as any, 'load').mockReturnThis();

    const config: ProjectConfig = new ProjectConfig('');
    config.endpoint = 'test';
    expect(config.getParameter('invalid')).toBeUndefined();
  });
});

describe('ProjectConfig.getFileName()', () => {
  test('should return file name for v4', () => {
    expect(ProjectConfig.getFileName()).toMatch('jovo.project.js');
  });

  test('should return file name for v3', () => {
    expect(ProjectConfig.getFileName('v3')).toMatch('project.js');
  });
});
