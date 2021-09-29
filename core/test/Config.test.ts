import { join as joinPaths, resolve } from 'path';
import { Config, ProjectConfigFile } from '../src';
import { Plugin } from './__mocks__/plugins/Plugin';

afterEach(() => {
  jest.restoreAllMocks();
});

describe('Config.getInstance()', () => {
  beforeEach(() => {
    delete Config['instance'];
  });

  test('should return instance of Config', () => {
    jest.spyOn(Config.prototype, 'getContent').mockReturnThis();
    jest.spyOn(Config.prototype, 'get').mockReturnThis();

    expect(Config['instance']).toBeUndefined();
    const config: Config = Config.getInstance('');

    expect(config).toBeDefined();
    expect(Config['instance']).toBeDefined();
    expect(config === Config['instance']).toBeTruthy();
  });

  test('should not return instance of Config if one exists already', () => {
    jest.spyOn(Config.prototype, 'getContent').mockReturnThis();
    jest.spyOn(Config.prototype, 'get').mockReturnThis();

    expect(Config['instance']).toBeUndefined();
    const config1: Config = Config.getInstance('');
    expect(Config['instance']).toBeDefined();

    const config2: Config = Config.getInstance('');
    expect(config1 === config2).toBeTruthy();
  });
});

describe('new Config()', () => {
  test('should load the config', () => {
    jest.spyOn(Config.prototype, 'getContent').mockReturnThis();
    jest.spyOn(Config.prototype, 'get').mockReturnValue({ endpoint: 'test' });

    const config: Config = new Config('');

    expect(config['config']).toBeDefined();
    expect(config['config'].endpoint).toMatch('test');
    expect(config['stage']).toBeUndefined();
  });

  test('should load the stage from config if not provided', () => {
    jest.spyOn(Config.prototype, 'getContent').mockReturnValue({ defaultStage: 'dev' });
    jest.spyOn(Config.prototype, 'get').mockReturnThis();

    const config: Config = new Config('');

    expect(config['stage']).toBeDefined();
    expect(config['stage']).toMatch('dev');
  });
});

describe('get()', () => {
  test('should return raw config, if stage is not defined', () => {
    jest.spyOn(Config.prototype, 'getContent').mockReturnValue({ endpoint: 'test' });
    jest.spyOn(Config.prototype, 'get').mockReturnValueOnce({});

    const config: Config = new Config('');
    const configContent: ProjectConfigFile = config.get();

    expect(configContent).toBeDefined();
    expect(configContent).toHaveProperty('endpoint');
    expect(configContent.endpoint).toMatch('test');
  });

  test('should return raw config, if no config exists for the provided stage', () => {
    jest
      .spyOn(Config.prototype, 'getContent')
      .mockReturnValue({ endpoint: 'test', stages: { prod: { endpoint: 'prod' } } });
    jest.spyOn(Config.prototype, 'get').mockReturnValueOnce({});

    const config: Config = new Config('', 'dev');
    const configContent: ProjectConfigFile = config.get();

    expect(configContent).toBeDefined();
    expect(configContent).toHaveProperty('endpoint');
    expect(configContent.endpoint).toMatch('test');
    expect(configContent.stages).toBeDefined();
  });

  test('should merge and return the config for the provided stage', () => {
    jest
      .spyOn(Config.prototype, 'getContent')
      .mockReturnValue({ endpoint: 'test', stages: { dev: { endpoint: 'dev' } } });
    jest.spyOn(Config.prototype, 'get').mockReturnValueOnce({});

    const config: Config = new Config('', 'dev');
    const configContent: ProjectConfigFile = config.get();

    expect(configContent).toBeDefined();
    expect(configContent).toHaveProperty('endpoint');
    expect(configContent.endpoint).toMatch('dev');
    expect(configContent.stages).toBeUndefined();
  });

  test('should merge and return the config with merged plugins for the provided stage', () => {
    const stagedPlugin: Plugin = new Plugin({ files: { foo2: 'bar2' } });
    stagedPlugin.$id = 'stagedCliPlugin';

    jest.spyOn(Config.prototype, 'getContent').mockReturnValue({
      plugins: [new Plugin({ files: { foo1: 'bar1' } })],
      stages: {
        dev: {
          plugins: [stagedPlugin],
        },
      },
    });
    jest.spyOn(Config.prototype, 'get').mockReturnValueOnce({});

    const config: Config = new Config('', 'dev');
    const configContent: ProjectConfigFile = config.get();

    expect(configContent).toBeDefined();
    expect(configContent.stages).toBeUndefined();
    expect(configContent).toHaveProperty('plugins');
    expect(configContent.plugins).toHaveLength(1);
    expect(configContent.plugins![0].$id).toMatch('stagedCliPlugin');
    expect(configContent.plugins![0].$config.files).toHaveProperty('foo1');
    expect(configContent.plugins![0].$config.files!.foo1).toMatch('bar1');
    expect(configContent.plugins![0].$config.files).toHaveProperty('foo2');
    expect(configContent.plugins![0].$config.files!.foo2).toMatch('bar2');
  });
});

describe('getContent()', () => {
  test('should return raw config content', () => {
    jest.spyOn(Config.prototype, 'getContent').mockReturnValueOnce({});
    jest.spyOn(Config.prototype, 'get').mockReturnThis();

    const config: Config = new Config(resolve(joinPaths('test', '__mocks__')));
    const configContent: ProjectConfigFile = config.getContent();

    expect(configContent).toBeDefined();
    expect(configContent).toHaveProperty('endpoint');
    expect(configContent.endpoint).toMatch('http://test.com');
  });

  test('should throw an error if config cannot be found', () => {
    jest.spyOn(Config.prototype, 'getContent').mockReturnValueOnce({});
    jest.spyOn(Config.prototype, 'get').mockReturnThis();

    const config: Config = new Config(resolve(joinPaths('test', '__mocks__', 'invalid')));

    expect(config.getContent.bind(config)).toThrow('Could not load project configuration.');
  });
});

describe('getParameter()', () => {
  test('should return the correct parameter', () => {
    jest.spyOn(Config.prototype, 'getContent').mockReturnThis();
    jest.spyOn(Config.prototype, 'get').mockReturnThis();

    const config: Config = new Config('');
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    config['config'] = { endpoint: 'test' };
    expect(config.getParameter('endpoint')).toMatch('test');
  });

  test('should return undefined if the paramater does not exist', () => {
    jest.spyOn(Config.prototype, 'getContent').mockReturnThis();
    jest.spyOn(Config.prototype, 'get').mockReturnThis();

    const config: Config = new Config('');
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    config['config'] = { endpoint: 'test' };
    expect(config.getParameter('invalid')).toBeUndefined();
  });
});

describe('getPath()', () => {
  test('should return path to config file', () => {
    jest.spyOn(Config.prototype, 'getContent').mockReturnThis();
    jest.spyOn(Config.prototype, 'get').mockReturnThis();

    const config: Config = new Config('test');
    expect(config.getPath()).toMatch(joinPaths('test', 'jovo.project.js'));
  });
});

describe('Config.getFileName()', () => {
  test('should return file name', () => {
    expect(Config.getFileName()).toMatch('jovo.project.js');
  });
});
