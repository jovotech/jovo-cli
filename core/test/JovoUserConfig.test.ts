import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join as joinPaths, resolve } from 'path';
import { deleteFolderRecursive, Preset, JovoUserConfig, JovoUserConfigFile } from '../src';

const testPath: string = resolve(joinPaths('test', 'tmpTestFolderJovoUserConfig'));
const configDirectory: string = joinPaths(testPath, '.jovo');

jest.mock('os', () => ({
  ...Object.assign({}, jest.requireActual('os')),
  homedir() {
    return resolve(joinPaths('test', 'tmpTestFolderJovoUserConfig'));
  },
}));

describe('new JovoUserConfig()', () => {
  test('should create a new config', () => {
    const mocked: jest.SpyInstance = jest.spyOn(JovoUserConfig.prototype, 'get').mockReturnValue({
      webhook: {
        uuid: 'test',
      },
      cli: {
        plugins: [],
        presets: [],
      },
    });

    const config: JovoUserConfig = new JovoUserConfig();
    expect(config['config']).toBeDefined();
    expect(config['config']).toHaveProperty('webhook');
    expect(config['config'].webhook).toHaveProperty('uuid');
    expect(config['config'].webhook.uuid).toMatch('test');

    mocked.mockRestore();
  });
});

describe('JovoUserConfig.getPath()', () => {
  test('should return .jovo/config', () => {
    expect(JovoUserConfig.getPath()).toMatch(joinPaths('.jovo', 'config'));
  });
});

describe('get()', () => {
  test('should return config', () => {
    const mocked: jest.SpyInstance = jest
      .spyOn(JovoUserConfig.prototype, 'get')
      .mockReturnValueOnce({
        webhook: {
          uuid: 'test',
        },
        cli: {
          plugins: [],
          presets: [],
        },
      });

    mkdirSync(configDirectory, { recursive: true });
    writeFileSync(joinPaths(configDirectory, 'config'), JSON.stringify({ webhook: 'test' }));

    const config: JovoUserConfig = new JovoUserConfig();
    const configContent: JovoUserConfigFile = config.get();

    expect(configContent).toBeDefined();
    expect(configContent).toHaveProperty('webhook');
    expect(config['config'].webhook).toHaveProperty('uuid');
    expect(config['config'].webhook.uuid).toMatch('test');

    deleteFolderRecursive(testPath);
    mocked.mockRestore();
  });

  test('should create a new config, if it cannot be found', () => {
    const mockedGet: jest.SpyInstance = jest
      .spyOn(JovoUserConfig.prototype, 'get')
      .mockReturnValueOnce({
        webhook: {
          uuid: 'test',
        },
        cli: {
          plugins: [],
          presets: [],
        },
      });
    const mockedCreate: jest.SpyInstance = jest
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      .spyOn(JovoUserConfig.prototype, 'create')
      .mockReturnThis();

    const config: JovoUserConfig = new JovoUserConfig();
    config.get();

    expect(mockedCreate).toHaveBeenCalled();

    mockedGet.mockRestore();
    mockedCreate.mockRestore();
  });

  test('should throw an error if something went wrong while parsing the config', () => {
    const mocked: jest.SpyInstance = jest
      .spyOn(JovoUserConfig.prototype, 'get')
      .mockReturnValueOnce({
        webhook: {
          uuid: '',
        },
        cli: {
          plugins: [],
          presets: [],
        },
      });

    mkdirSync(configDirectory, { recursive: true });
    writeFileSync(joinPaths(configDirectory, 'config'), '{');

    const config: JovoUserConfig = new JovoUserConfig();
    expect(config.get.bind(config)).toThrow('Error while trying to parse .jovo/config.');

    deleteFolderRecursive(testPath);
    mocked.mockRestore();
  });
});

describe('save()', () => {
  beforeEach(() => {
    mkdirSync(testPath, { recursive: true });
  });

  afterEach(() => {
    deleteFolderRecursive(testPath);
  });

  test('should create .jovo/ folder if it does not exist', () => {
    expect(existsSync(joinPaths(configDirectory))).toBeFalsy();

    const mocked: jest.SpyInstance = jest.spyOn(JovoUserConfig.prototype, 'get').mockReturnThis();

    const config: JovoUserConfig = new JovoUserConfig();
    config.save({
      webhook: {
        uuid: '',
      },
      cli: {
        plugins: [],
        presets: [],
      },
    });

    expect(existsSync(joinPaths(configDirectory))).toBeTruthy();

    mocked.mockRestore();
  });

  test('should save the new config', () => {
    const mocked: jest.SpyInstance = jest.spyOn(JovoUserConfig.prototype, 'get').mockReturnThis();

    const config: JovoUserConfig = new JovoUserConfig();
    const configFile: JovoUserConfigFile = {
      webhook: {
        uuid: 'saved',
      },
      cli: {
        plugins: [],
        presets: [],
      },
    };
    config.save(configFile);

    expect(existsSync(joinPaths(configDirectory, 'config'))).toBeTruthy();
    expect(config['config']).toHaveProperty('webhook');
    expect(config['config'].webhook).toHaveProperty('uuid');
    expect(config['config'].webhook.uuid).toMatch('saved');

    const savedConfigFile: JovoUserConfigFile = JSON.parse(
      readFileSync(joinPaths(configDirectory, 'config'), 'utf-8'),
    );
    expect(savedConfigFile).toStrictEqual(config['config']);

    mocked.mockRestore();
  });
});

describe('getParameter()', () => {
  test('should return webhook uuid', () => {
    const mocked: jest.SpyInstance = jest.spyOn(JovoUserConfig.prototype, 'get').mockReturnValue({
      webhook: {
        uuid: 'test',
      },
      cli: {
        plugins: [],
        presets: [],
      },
    });

    const config: JovoUserConfig = new JovoUserConfig();

    expect(config.getParameter('webhook.uuid')).toBeDefined();
    // expect(config.getParameter('webhook.uuid')).toMatch(
    //   /[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}/,
    // );
    expect(config.getParameter('webhook.uuid')).toMatch('test');

    mocked.mockRestore();
  });

  test('should return undefined for a nonexisting property', () => {
    const mocked: jest.SpyInstance = jest.spyOn(JovoUserConfig.prototype, 'get').mockReturnValue({
      webhook: {
        uuid: 'test',
      },
      cli: {
        plugins: [],
        presets: [],
      },
    });

    const config: JovoUserConfig = new JovoUserConfig();
    expect(config.getParameter('invalid')).toBeUndefined();

    mocked.mockRestore();
  });
});

describe('getPresets()', () => {
  test('should return presets', () => {
    const mocked: jest.SpyInstance = jest.spyOn(JovoUserConfig.prototype, 'get').mockReturnValue({
      webhook: {
        uuid: 'test',
      },
      cli: {
        plugins: [],
        presets: [
          {
            name: 'presetName',
            projectName: '',
            locales: [],
            language: 'javascript',
            platforms: [],
            linter: true,
            unitTesting: true,
          },
        ],
      },
    });

    const config: JovoUserConfig = new JovoUserConfig();
    const presets: Preset[] = config.getPresets();
    expect(presets).toBeDefined();
    expect(presets).toHaveLength(1);
    expect(presets[0]).toHaveProperty('name');
    expect(presets[0].name).toMatch('presetName');

    mocked.mockRestore();
  });
});

describe('getWebhookUuid()', () => {
  test('should return webhook uuid', () => {
    const mocked: jest.SpyInstance = jest.spyOn(JovoUserConfig.prototype, 'get').mockReturnValue({
      webhook: {
        uuid: 'test',
      },
      cli: {
        plugins: [],
        presets: [],
      },
    });

    const config: JovoUserConfig = new JovoUserConfig();
    const webhookUuid: string = config.getWebhookUuid();
    expect(webhookUuid).toBeDefined();
    expect(webhookUuid).toMatch('test');

    mocked.mockRestore();
  });
});

describe('getPreset()', () => {
  test('should return correct preset', () => {
    const mocked: jest.SpyInstance = jest.spyOn(JovoUserConfig.prototype, 'get').mockReturnValue({
      webhook: {
        uuid: 'test',
      },
      cli: {
        plugins: [],
        presets: [
          {
            name: 'presetName',
            projectName: '',
            locales: [],
            language: 'javascript',
            platforms: [],
            linter: true,
            unitTesting: true,
          },
        ],
      },
    });

    const config: JovoUserConfig = new JovoUserConfig();
    const preset: Preset = config.getPreset('presetName');

    expect(preset).toBeDefined();

    mocked.mockRestore();
  });

  test('should fail if preset does not exist', () => {
    const mocked: jest.SpyInstance = jest.spyOn(JovoUserConfig.prototype, 'get').mockReturnValue({
      webhook: {
        uuid: 'test',
      },
      cli: {
        plugins: [],
        presets: [],
      },
    });

    const config: JovoUserConfig = new JovoUserConfig();
    expect(config.getPreset.bind(config, 'test')).toThrow('Could not find preset test.');

    mocked.mockRestore();
  });
});

describe('savePreset()', () => {
  // ToDo: Mock promptForOVerwrite and test for overwriting presets.
  test('should save preset', () => {
    const mockedGet: jest.SpyInstance = jest
      .spyOn(JovoUserConfig.prototype, 'get')
      .mockReturnValue({
        webhook: {
          uuid: 'test',
        },
        cli: {
          plugins: [],
          presets: [],
        },
      });
    const mockedSave: jest.SpyInstance = jest
      .spyOn(JovoUserConfig.prototype, 'save')
      .mockReturnThis();

    const config: JovoUserConfig = new JovoUserConfig();
    const preset: Preset = {
      name: 'test',
      projectName: '',
      language: 'javascript',
      platforms: [],
      locales: [],
      linter: true,
      unitTesting: true,
    };
    config.savePreset(preset);
    expect(config['config'].cli.presets).toHaveLength(1);
    expect(config['config'].cli.presets[0].name).toMatch('test');

    mockedGet.mockRestore();
    mockedSave.mockRestore();
  });
});
