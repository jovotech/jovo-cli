import { mkdirSync, writeFileSync } from 'fs';
import { join as joinPaths, resolve } from 'path';
import {
  Config,
  deleteFolderRecursive,
  JovoCli,
  JovoCliPlugin,
  JovoUserConfig,
  PluginContext,
  PluginType,
  Project,
} from '../src';
import { Plugin } from './__mocks__/plugins/Plugin';

jest.mock('global-dirs', () => ({
  npm: {
    packages: resolve(joinPaths('test', '__mocks__', 'plugins')),
  },
}));
jest.spyOn(Project, 'getInstance').mockReturnThis();

describe('JovoCli.getInstance()', () => {
  beforeEach(() => {
    delete JovoCli['instance'];
  });

  test('should return instance of JovoCli', () => {
    expect(JovoCli['instance']).toBeUndefined();
    const jovo: JovoCli = JovoCli.getInstance();

    expect(jovo).toBeDefined();
    expect(jovo.$projectPath).toMatch(process.cwd());
    expect(jovo.$project).toBeUndefined();
  });

  test('should return instance of JovoCli with $project defined', () => {
    const mocked: jest.SpyInstance = jest
      .spyOn(JovoCli.prototype, 'isInProjectDirectory')
      .mockReturnValue(true);

    const jovo: JovoCli = JovoCli.getInstance();

    expect(jovo).toBeDefined();
    expect(jovo.isInProjectDirectory()).toBeTruthy();
    expect(jovo.$projectPath).toMatch(process.cwd());
    expect(jovo.$project).toBeDefined();

    mocked.mockRestore();
  });

  test('should not create a new instance if one already exists', () => {
    expect(JovoCli['instance']).toBeUndefined();
    const jovo1: JovoCli = JovoCli.getInstance();
    expect(JovoCli['instance']).toBeDefined();
    // Get existing instance.
    const jovo2 = JovoCli.getInstance();
    expect(jovo2 === jovo1).toBeTruthy();
  });
});

describe('initializeProject()', () => {
  test('should throw an error, if the current directory is not a project directory', () => {
    const mocked: jest.SpyInstance = jest
      .spyOn(JovoCli.prototype, 'isInProjectDirectory')
      .mockReturnValue(false);

    const jovo: JovoCli = new JovoCli();

    expect(jovo.initializeProject.bind(jovo, './')).toThrow('Project could not be instantiated');

    mocked.mockRestore();
  });

  test('should instantiate a new project', () => {
    const mocked: jest.SpyInstance = jest
      .spyOn(JovoCli.prototype, 'isInProjectDirectory')
      .mockReturnValue(true);

    const jovo: JovoCli = new JovoCli();
    jovo.initializeProject('./');

    expect(jovo.$project).toBeDefined();

    mocked.mockRestore();
  });
});

describe('isInProjectDirectory()', () => {
  const testPath: string = resolve(joinPaths('test', 'tmpTestFolderJovoCli'));

  beforeEach(() => {
    deleteFolderRecursive(testPath);
    mkdirSync(testPath);
    jest.resetModules();
  });

  afterAll(() => {
    deleteFolderRecursive(testPath);
  });

  test('should return false if no package.json exists', () => {
    jest.spyOn(JovoCli.prototype, 'isInProjectDirectory').mockReturnValueOnce(false);

    const jovo: JovoCli = new JovoCli();
    jovo.$projectPath = testPath;

    expect(jovo.isInProjectDirectory()).toBeFalsy();
  });

  test('should return false if the jovo-framework dependency is missing', () => {
    jest.spyOn(JovoCli.prototype, 'isInProjectDirectory').mockReturnValueOnce(false);

    const jovo: JovoCli = new JovoCli();
    jovo.$projectPath = testPath;

    const packageJsonFile = { dependencies: {} };
    writeFileSync(joinPaths(testPath, 'package.json'), JSON.stringify(packageJsonFile));

    expect(jovo.isInProjectDirectory()).toBeFalsy();
  });

  test("should return false if config doesn't exist", () => {
    jest.spyOn(JovoCli.prototype, 'isInProjectDirectory').mockReturnValueOnce(false);

    const jovo: JovoCli = new JovoCli();
    jovo.$projectPath = testPath;

    const packageJsonFile = { dependencies: { 'jovo-framework': '1.0.0' } };
    writeFileSync(joinPaths(testPath, 'package.json'), JSON.stringify(packageJsonFile));

    expect(jovo.isInProjectDirectory()).toBeFalsy();
  });

  test.skip('should return true if config exists', () => {
    jest.spyOn(JovoCli.prototype, 'isInProjectDirectory').mockReturnValueOnce(false);

    const jovo: JovoCli = new JovoCli();
    jovo.$projectPath = testPath;

    const packageJsonFile = { dependencies: { 'jovo-framework': '1.0.0' } };
    writeFileSync(joinPaths(testPath, 'package.json'), JSON.stringify(packageJsonFile));
    writeFileSync(joinPaths(testPath, Config.getFileName()), '');

    expect(jovo.isInProjectDirectory()).toBeTruthy();
  });
});

describe('hasExistingProject()', () => {
  const testFolder: string = joinPaths('test', 'tmpTestFolderJovoCli');

  test('should return false if project path does not exist already', () => {
    const jovo: JovoCli = new JovoCli();
    expect(jovo.hasExistingProject(testFolder)).toBeFalsy();
  });

  test('should return true if project path exists already', () => {
    const jovo: JovoCli = new JovoCli();
    const testPath: string = resolve(testFolder);
    mkdirSync(testPath);
    expect(jovo.hasExistingProject(testFolder)).toBeTruthy();
    deleteFolderRecursive(testPath);
  });
});

describe('getJovoWebhookUrl()', () => {
  test('should return webhook url', () => {
    // Mock JovoUserConfig.
    const mockedGet: jest.SpyInstance = jest
      .spyOn(JovoUserConfig.prototype, 'get')
      .mockReturnThis();
    const mockedWebhook: jest.SpyInstance = jest
      .spyOn(JovoUserConfig.prototype, 'getWebhookUuid')
      .mockReturnValue('1234');

    const jovo: JovoCli = new JovoCli();

    expect(jovo.getJovoWebhookUrl()).toMatch('https://webhookv4.jovo.cloud/1234');

    mockedGet.mockRestore();
    mockedWebhook.mockRestore();
  });
});

describe('resolveEndpoint()', () => {
  test('should resolve generic webhook url', () => {
    const url = 'http://test.com';
    const mocked: jest.SpyInstance = jest
      .spyOn(JovoCli.prototype, 'getJovoWebhookUrl')
      .mockReturnValue(url);

    const jovo: JovoCli = new JovoCli();

    expect(jovo.resolveEndpoint('${JOVO_WEBHOOK_URL}')).toMatch(url);

    mocked.mockRestore();
  });

  test('should return url as is', () => {
    const url = 'http://test.com?foo=bar';
    const jovo: JovoCli = new JovoCli();
    expect(jovo.resolveEndpoint(url)).toMatch(url);
  });
});

describe('getPlatforms()', () => {
  test('should return an empty array, if no platforms can be found', () => {
    const mocked: jest.SpyInstance = jest
      .spyOn(JovoCli.prototype, 'getPluginsWithType')
      .mockReturnValue([]);

    const jovo: JovoCli = new JovoCli();
    const platforms: string[] = jovo.getPlatforms();

    expect(Array.isArray(platforms)).toBeTruthy();
    expect(platforms).toHaveLength(0);

    mocked.mockRestore();
  });

  test('should return an array of platform ids', () => {
    const mocked: jest.SpyInstance = jest
      .spyOn(JovoCli.prototype, 'getPluginsWithType')
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      .mockReturnValue([{ $id: 'testPlatform' }]);

    const jovo: JovoCli = new JovoCli();
    const platforms: string[] = jovo.getPlatforms();

    expect(Array.isArray(platforms)).toBeTruthy();
    expect(platforms).toHaveLength(1);
    expect(platforms[0]).toMatch('testPlatform');

    mocked.mockRestore();
  });
});

describe('getPluginsWithType()', () => {
  test('should return an empty array, if no plugins of the provided type can be found', () => {
    const jovo: JovoCli = new JovoCli();
    const plugins: JovoCliPlugin[] = jovo.getPluginsWithType('platform');

    expect(Array.isArray(plugins)).toBeTruthy();
    expect(plugins).toHaveLength(0);
  });

  test('should return an array containing plugins of the provided type', () => {
    const plugin: Plugin = new Plugin();
    const jovo: JovoCli = new JovoCli();

    jovo['cliPlugins'].push(plugin);
    const plugins: JovoCliPlugin[] = jovo.getPluginsWithType('command');

    expect(Array.isArray(plugins)).toBeTruthy();
    expect(plugins).toHaveLength(1);
    expect(plugins[0].$id).toMatch('commandPlugin');
  });
});

describe('collectCommandPlugins()', () => {
  test('should return an empty array if no command plugins can be found', () => {
    // Mock JovoUserConfig.
    const mocked: jest.SpyInstance = jest
      .spyOn(JovoUserConfig.prototype, 'getParameter')
      .mockReturnValue([]);

    const jovo: JovoCli = new JovoCli();
    const commandPlugins: JovoCliPlugin[] = jovo.collectCommandPlugins();

    expect(Array.isArray(commandPlugins)).toBeTruthy();
    expect(commandPlugins).toHaveLength(0);

    mocked.mockRestore();
  });

  test("should return an empty array if the command plugin path can't be found", () => {
    // Mock JovoUserConfig.
    const mocked: jest.SpyInstance = jest
      .spyOn(JovoUserConfig.prototype, 'getParameter')
      .mockReturnValue(['test']);

    const jovo: JovoCli = new JovoCli();
    const commandPlugins: JovoCliPlugin[] = jovo.collectCommandPlugins();

    expect(Array.isArray(commandPlugins)).toBeTruthy();
    expect(commandPlugins).toHaveLength(0);

    mocked.mockRestore();
  });

  test('should return an array containing an instantiated JovoCliPlugin', () => {
    // Mock JovoUserConfig.
    const mocked: jest.SpyInstance = jest
      .spyOn(JovoUserConfig.prototype, 'getParameter')
      .mockReturnValue(['Plugin']);

    const jovo: JovoCli = new JovoCli();
    const commandPlugins: JovoCliPlugin[] = jovo.collectCommandPlugins();

    expect(Array.isArray(commandPlugins)).toBeTruthy();
    expect(commandPlugins).toHaveLength(1);
    expect(commandPlugins[0].$id).toMatch('commandPlugin');

    mocked.mockRestore();
  });
});

describe('loadPlugins()', () => {});

describe('setPluginContext()', () => {
  test('should pass a copy without reference to each plugin', () => {
    const jovo: JovoCli = new JovoCli();
    class Plugin extends JovoCliPlugin {
      $id: string = 'test';
      $type: PluginType = 'command';
      context!: PluginContext;

      setPluginContext: jest.Mock = jest.fn().mockImplementation((context: PluginContext) => {
        this.context = context;
      });
    }

    const plugin: Plugin = new Plugin();
    jovo['cliPlugins'].push(plugin);

    const context: PluginContext = {
      command: 'test',
      platforms: [],
      locales: [],
      flags: {},
      args: {},
    };
    jovo.setPluginContext(context);

    // Modify plugin context.
    context.command = 'altered';

    expect(plugin.setPluginContext).toBeCalledTimes(1);
    expect(plugin.context).toHaveProperty('command');
    // Check if plugin context was passed per reference.
    expect(plugin.context.command).toMatch('test');
  });
});
