import { mkdirSync, writeFileSync } from 'fs';
import { join as joinPaths, resolve } from 'path';
import {
  Config,
  deleteFolderRecursive,
  JovoCli,
  JovoCliPlugin,
  UserConfig,
  PluginType,
  Project,
} from '../src';

// Mock JovoUserConfig
jest.mock('../src/UserConfig');
jest.spyOn(Project, 'getInstance').mockReturnThis();

describe('JovoCli.getInstance()', () => {
  beforeEach(() => {
    delete JovoCli['instance'];
  });

  test('should return instance of JovoCli', () => {
    expect(JovoCli['instance']).toBeUndefined();
    const cli: JovoCli = JovoCli.getInstance();

    expect(cli).toBeDefined();
    expect(cli.projectPath).toMatch(process.cwd());
    expect(cli.project).toBeUndefined();
  });

  test('should return instance of JovoCli with project defined', () => {
    const mocked: jest.SpyInstance = jest
      .spyOn(JovoCli.prototype, 'isInProjectDirectory')
      .mockReturnValue(true);

    const jovo: JovoCli = JovoCli.getInstance();

    expect(jovo).toBeDefined();
    expect(jovo.isInProjectDirectory()).toBeTruthy();
    expect(jovo.projectPath).toMatch(process.cwd());
    expect(jovo.project).toBeDefined();

    mocked.mockRestore();
  });

  test('should not create a new instance if one already exists', () => {
    expect(JovoCli['instance']).toBeUndefined();
    const cli1: JovoCli = JovoCli.getInstance();
    expect(JovoCli['instance']).toBeDefined();
    // Get existing instance.
    const cli2: JovoCli = JovoCli.getInstance();
    expect(cli2 === cli1).toBeTruthy();
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
    jovo.projectPath = testPath;

    expect(jovo.isInProjectDirectory()).toBeFalsy();
  });

  test('should return false if the jovo-framework dependency is missing', () => {
    jest.spyOn(JovoCli.prototype, 'isInProjectDirectory').mockReturnValueOnce(false);

    const jovo: JovoCli = new JovoCli();
    jovo.projectPath = testPath;

    const packageJsonFile = { dependencies: {} };
    writeFileSync(joinPaths(testPath, 'package.json'), JSON.stringify(packageJsonFile));

    expect(jovo.isInProjectDirectory()).toBeFalsy();
  });

  test("should return false if config doesn't exist", () => {
    jest.spyOn(JovoCli.prototype, 'isInProjectDirectory').mockReturnValueOnce(false);

    const jovo: JovoCli = new JovoCli();
    jovo.projectPath = testPath;

    const packageJsonFile = { dependencies: { '@jovotech/framework': '1.0.0' } };
    jest.mock(joinPaths(testPath, 'package.json'), () => packageJsonFile, { virtual: true });
    writeFileSync(joinPaths(testPath, 'package.json'), JSON.stringify(packageJsonFile));

    expect(jovo.isInProjectDirectory()).toBeFalsy();
  });

  test('should return true if config exists', () => {
    jest.spyOn(JovoCli.prototype, 'isInProjectDirectory').mockReturnValueOnce(false);

    const jovo: JovoCli = new JovoCli();
    jovo.projectPath = testPath;

    const packageJsonFile = { dependencies: { '@jovotech/framework': '1.0.0' } };
    jest.mock(joinPaths(testPath, 'package.json'), () => packageJsonFile, { virtual: true });

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
    const mockedWebhook: jest.SpyInstance = jest
      .spyOn(UserConfig.prototype, 'getWebhookUuid')
      .mockReturnValue('1234');

    const jovo: JovoCli = new JovoCli();

    expect(jovo.getJovoWebhookUrl()).toMatch('https://webhookv4.jovo.cloud/1234');

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
      .mockReturnValue([{ id: 'testPlatform' }]);

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
    class Plugin extends JovoCliPlugin {
      id: string = 'commandPlugin';
      type: PluginType = 'command';
    }

    const plugin: Plugin = new Plugin();
    const jovo: JovoCli = new JovoCli();

    jovo['plugins'].push(plugin);
    const plugins: JovoCliPlugin[] = jovo.getPluginsWithType('command');

    expect(Array.isArray(plugins)).toBeTruthy();
    expect(plugins).toHaveLength(1);
    expect(plugins[0].id).toMatch('commandPlugin');
  });
});

describe('collectCommandPlugins()', () => {
  test('should return an empty array if no command plugins can be found', () => {
    // Mock JovoUserConfig.
    const mocked: jest.SpyInstance = jest
      .spyOn(UserConfig.prototype, 'getParameter')
      .mockReturnValue([]);
    process.env.JOVO_CLI_EXEC_PATH = '';

    const jovo: JovoCli = new JovoCli();
    const commandPlugins: JovoCliPlugin[] = jovo.collectCommandPlugins();

    expect(Array.isArray(commandPlugins)).toBeTruthy();
    expect(commandPlugins).toHaveLength(0);

    delete process.env.JOVO_CLI_EXEC_PATH;
    mocked.mockRestore();
  });

  test("should return an empty array if the command plugin path can't be found", () => {
    // Mock JovoUserConfig.
    const mocked: jest.SpyInstance = jest
      .spyOn(UserConfig.prototype, 'getParameter')
      .mockReturnValue(['test']);
    process.env.JOVO_CLI_EXEC_PATH = '';

    const jovo: JovoCli = new JovoCli();
    const commandPlugins: JovoCliPlugin[] = jovo.collectCommandPlugins();

    expect(Array.isArray(commandPlugins)).toBeTruthy();
    expect(commandPlugins).toHaveLength(0);

    delete process.env.JOVO_CLI_EXEC_PATH;
    mocked.mockRestore();
  });

  test('should return an array containing an instantiated JovoCliPlugin', () => {
    // Mock JovoUserConfig.
    const mocked: jest.SpyInstance = jest
      .spyOn(UserConfig.prototype, 'getParameter')
      .mockReturnValue(['Plugin']);
    process.env.JOVO_CLI_EXEC_PATH = resolve(joinPaths('test', '__mocks__', 'plugins', 'Plugin'));

    const jovo: JovoCli = new JovoCli();
    const commandPlugins: JovoCliPlugin[] = jovo.collectCommandPlugins();

    expect(Array.isArray(commandPlugins)).toBeTruthy();
    expect(commandPlugins).toHaveLength(1);
    expect(commandPlugins[0].id).toMatch('commandPlugin');

    delete process.env.JOVO_CLI_EXEC_PATH;
    mocked.mockRestore();
  });
});

describe('loadPlugins()', () => {});
