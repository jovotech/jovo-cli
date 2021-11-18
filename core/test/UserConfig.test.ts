import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join as joinPaths, resolve } from 'path';
import { deleteFolderRecursive, JovoUserConfigFile, Preset, UserConfig } from '../src';

const testPath: string = resolve(joinPaths('test', 'tmpTestFolderUserConfig'));
const configDirectory: string = joinPaths(testPath, '.jovo');

jest.mock('os', () => ({
  ...Object.assign({}, jest.requireActual('os')),
  homedir() {
    return resolve(joinPaths('test', 'tmpTestFolderUserConfig'));
  },
}));

afterEach(() => {
  jest.restoreAllMocks();
});

describe('new UserConfig()', () => {
  test('should create a new config', () => {
    jest.spyOn(UserConfig.prototype, 'savePreset').mockReturnThis();
    jest.spyOn(UserConfig.prototype, 'get').mockReturnValue({
      webhook: {
        uuid: 'test',
      },
      cli: {
        plugins: [],
        presets: [],
      },
    });

    const config: UserConfig = new UserConfig();
    expect(config['config']).toBeDefined();
    expect(config['config']).toHaveProperty('webhook');
    expect(config['config'].webhook).toHaveProperty('uuid');
    expect(config['config'].webhook.uuid).toMatch('test');
  });

  test("should create a new default preset if it doesn't exist", () => {
    const mockedSavePreset: jest.SpyInstance = jest
      .spyOn(UserConfig.prototype, 'savePreset')
      .mockReturnThis();
    jest.spyOn(UserConfig.prototype, 'get').mockReturnValue({
      webhook: {
        uuid: 'test',
      },
      cli: {
        plugins: [],
        presets: [],
      },
    });

    new UserConfig();
    expect(mockedSavePreset).toBeCalledTimes(1);
    expect(mockedSavePreset).toBeCalledWith<Preset[]>({
      name: 'default',
      platforms: [],
      locales: ['en'],
      projectName: 'helloworld',
      language: 'typescript',
    });
  });
});

describe('UserConfig.getPath()', () => {
  test('should return .jovo/config', () => {
    expect(UserConfig.getPath()).toMatch(joinPaths('.jovo', 'config'));
  });
});

describe('get()', () => {
  test('should return config', () => {
    jest.spyOn(UserConfig.prototype, 'savePreset').mockReturnThis();
    jest.spyOn(UserConfig.prototype, 'get').mockReturnValueOnce({
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

    const config: UserConfig = new UserConfig();
    const configContent: JovoUserConfigFile = config.get();

    expect(configContent).toBeDefined();
    expect(configContent).toHaveProperty('webhook');
    expect(config['config'].webhook).toHaveProperty('uuid');
    expect(config['config'].webhook.uuid).toMatch('test');

    deleteFolderRecursive(testPath);
  });

  test('should create a new config, if it cannot be found', () => {
    jest.spyOn(UserConfig.prototype, 'savePreset').mockReturnThis();
    jest.spyOn(UserConfig.prototype, 'get').mockReturnValueOnce({
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
      .spyOn(UserConfig.prototype, 'create')
      .mockReturnThis();

    const config: UserConfig = new UserConfig();
    config.get();

    expect(mockedCreate).toHaveBeenCalled();
  });

  test('should throw an error if something went wrong while parsing the config', () => {
    jest.spyOn(UserConfig.prototype, 'get').mockReturnValueOnce({
      webhook: {
        uuid: '',
      },
      cli: {
        plugins: [],
        presets: [],
      },
    });
    jest.spyOn(UserConfig.prototype, 'savePreset').mockReturnThis();

    mkdirSync(configDirectory, { recursive: true });
    writeFileSync(joinPaths(configDirectory, 'config'), '{');

    const config: UserConfig = new UserConfig();
    expect(config.get.bind(config)).toThrow('Error while trying to parse .jovo/config.');

    deleteFolderRecursive(testPath);
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

    jest
      .spyOn(UserConfig.prototype, 'get')
      .mockReturnValue({ webhook: { uuid: '' }, cli: { plugins: [], presets: [] } });
    jest.spyOn(UserConfig.prototype, 'savePreset').mockReturnThis();

    const config: UserConfig = new UserConfig();
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
  });

  test('should save the new config', () => {
    jest
      .spyOn(UserConfig.prototype, 'get')
      .mockReturnValue({ webhook: { uuid: '' }, cli: { plugins: [], presets: [] } });
    jest.spyOn(UserConfig.prototype, 'savePreset').mockReturnThis();

    const config: UserConfig = new UserConfig();
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
  });
});

describe('getParameter()', () => {
  test('should return webhook uuid', () => {
    jest.spyOn(UserConfig.prototype, 'savePreset').mockReturnThis();
    jest.spyOn(UserConfig.prototype, 'get').mockReturnValue({
      webhook: {
        uuid: 'test',
      },
      cli: {
        plugins: [],
        presets: [],
      },
    });

    const config: UserConfig = new UserConfig();

    expect(config.getParameter('webhook.uuid')).toBeDefined();
    // expect(config.getParameter('webhook.uuid')).toMatch(
    //   /[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}/,
    // );
    expect(config.getParameter('webhook.uuid')).toMatch('test');
  });

  test('should return undefined for a nonexisting property', () => {
    jest.spyOn(UserConfig.prototype, 'savePreset').mockReturnThis();
    jest.spyOn(UserConfig.prototype, 'get').mockReturnValue({
      webhook: {
        uuid: 'test',
      },
      cli: {
        plugins: [],
        presets: [],
      },
    });

    const config: UserConfig = new UserConfig();
    expect(config.getParameter('invalid')).toBeUndefined();
  });
});

describe('getPresets()', () => {
  test('should return presets', () => {
    jest.spyOn(UserConfig.prototype, 'savePreset').mockReturnThis();
    jest.spyOn(UserConfig.prototype, 'get').mockReturnValue({
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
            platforms: [],
            language: 'typescript',
          },
        ],
      },
    });

    const config: UserConfig = new UserConfig();
    const presets: Preset[] = config.getPresets();
    expect(presets).toBeDefined();
    expect(presets).toHaveLength(1);
    expect(presets[0]).toHaveProperty('name');
    expect(presets[0].name).toMatch('presetName');
  });
});

describe('getWebhookUuid()', () => {
  test('should return webhook uuid', () => {
    jest.spyOn(UserConfig.prototype, 'savePreset').mockReturnThis();
    jest.spyOn(UserConfig.prototype, 'get').mockReturnValue({
      webhook: {
        uuid: 'test',
      },
      cli: {
        plugins: [],
        presets: [],
      },
    });

    const config: UserConfig = new UserConfig();
    const webhookUuid: string = config.getWebhookUuid();
    expect(webhookUuid).toBeDefined();
    expect(webhookUuid).toMatch('test');
  });
});

describe('getPreset()', () => {
  test('should return correct preset', () => {
    jest.spyOn(UserConfig.prototype, 'savePreset').mockReturnThis();
    jest.spyOn(UserConfig.prototype, 'get').mockReturnValue({
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
            platforms: [],
            language: 'typescript',
          },
        ],
      },
    });

    const config: UserConfig = new UserConfig();
    const preset: Preset = config.getPreset('presetName');

    expect(preset).toBeDefined();
  });

  test('should fail if preset does not exist', () => {
    jest.spyOn(UserConfig.prototype, 'savePreset').mockReturnThis();
    jest.spyOn(UserConfig.prototype, 'get').mockReturnValue({
      webhook: {
        uuid: 'test',
      },
      cli: {
        plugins: [],
        presets: [],
      },
    });

    const config: UserConfig = new UserConfig();
    expect(config.getPreset.bind(config, 'test')).toThrow('Could not find preset test.');
  });
});

describe('savePreset()', () => {
  // TODO: Mock promptForOVerwrite and test for overwriting presets.
  test('should save preset', async () => {
    jest.spyOn(UserConfig.prototype, 'get').mockReturnValue({
      webhook: {
        uuid: 'test',
      },
      cli: {
        plugins: [],
        presets: [
          {
            name: 'default',
            language: 'typescript',
            platforms: [],
            projectName: '',
            locales: [],
          },
        ],
      },
    });
    jest.spyOn(UserConfig.prototype, 'save').mockReturnThis();

    const config: UserConfig = new UserConfig();
    const preset: Preset = {
      name: 'test',
      projectName: '',
      platforms: [],
      locales: [],
      language: 'typescript',
    };
    await config.savePreset(preset);
    expect(config['config'].cli.presets).toHaveLength(2);
    expect(config['config'].cli.presets[0].name).toMatch('default');
    expect(config['config'].cli.presets[1].name).toMatch('test');
  });
});
