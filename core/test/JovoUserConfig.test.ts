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

afterEach(() => {
  jest.restoreAllMocks();
});

describe('new JovoUserConfig()', () => {
  test('should create a new config', () => {
    jest.spyOn(JovoUserConfig.prototype, 'savePreset').mockReturnThis();
    jest.spyOn(JovoUserConfig.prototype, 'get').mockReturnValue({
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
  });

  test("should create a new default preset if it doesn't exist", () => {
    const mockedSavePreset: jest.SpyInstance = jest
      .spyOn(JovoUserConfig.prototype, 'savePreset')
      .mockReturnThis();
    jest.spyOn(JovoUserConfig.prototype, 'get').mockReturnValue({
      webhook: {
        uuid: 'test',
      },
      cli: {
        plugins: [],
        presets: [],
      },
    });

    new JovoUserConfig();
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

describe('JovoUserConfig.getPath()', () => {
  test('should return .jovo/config', () => {
    expect(JovoUserConfig.getPath()).toMatch(joinPaths('.jovo', 'configv4'));
  });
});

describe('get()', () => {
  test('should return config', () => {
    jest.spyOn(JovoUserConfig.prototype, 'savePreset').mockReturnThis();
    jest.spyOn(JovoUserConfig.prototype, 'get').mockReturnValueOnce({
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
  });

  test('should create a new config, if it cannot be found', () => {
    jest.spyOn(JovoUserConfig.prototype, 'savePreset').mockReturnThis();
    jest.spyOn(JovoUserConfig.prototype, 'get').mockReturnValueOnce({
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
  });

  test('should throw an error if something went wrong while parsing the config', () => {
    jest.spyOn(JovoUserConfig.prototype, 'get').mockReturnValueOnce({
      webhook: {
        uuid: '',
      },
      cli: {
        plugins: [],
        presets: [],
      },
    });
    jest.spyOn(JovoUserConfig.prototype, 'savePreset').mockReturnThis();

    mkdirSync(configDirectory, { recursive: true });
    writeFileSync(joinPaths(configDirectory, 'configv4'), '{');

    const config: JovoUserConfig = new JovoUserConfig();
    expect(config.get.bind(config)).toThrow('Error while trying to parse .jovo/configv4.');

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

    jest.spyOn(JovoUserConfig.prototype, 'get').mockReturnThis();
    jest.spyOn(JovoUserConfig.prototype, 'savePreset').mockReturnThis();

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
  });

  test('should save the new config', () => {
    jest.spyOn(JovoUserConfig.prototype, 'get').mockReturnThis();
    jest.spyOn(JovoUserConfig.prototype, 'savePreset').mockReturnThis();

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

    expect(existsSync(joinPaths(configDirectory, 'configv4'))).toBeTruthy();
    expect(config['config']).toHaveProperty('webhook');
    expect(config['config'].webhook).toHaveProperty('uuid');
    expect(config['config'].webhook.uuid).toMatch('saved');

    const savedConfigFile: JovoUserConfigFile = JSON.parse(
      readFileSync(joinPaths(configDirectory, 'configv4'), 'utf-8'),
    );
    expect(savedConfigFile).toStrictEqual(config['config']);
  });
});

describe('getParameter()', () => {
  test('should return webhook uuid', () => {
    jest.spyOn(JovoUserConfig.prototype, 'savePreset').mockReturnThis();
    jest.spyOn(JovoUserConfig.prototype, 'get').mockReturnValue({
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
  });

  test('should return undefined for a nonexisting property', () => {
    jest.spyOn(JovoUserConfig.prototype, 'savePreset').mockReturnThis();
    jest.spyOn(JovoUserConfig.prototype, 'get').mockReturnValue({
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
  });
});

describe('getPresets()', () => {
  test('should return presets', () => {
    jest.spyOn(JovoUserConfig.prototype, 'savePreset').mockReturnThis();
    jest.spyOn(JovoUserConfig.prototype, 'get').mockReturnValue({
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

    const config: JovoUserConfig = new JovoUserConfig();
    const presets: Preset[] = config.getPresets();
    expect(presets).toBeDefined();
    expect(presets).toHaveLength(1);
    expect(presets[0]).toHaveProperty('name');
    expect(presets[0].name).toMatch('presetName');
  });
});

describe('getWebhookUuid()', () => {
  test('should return webhook uuid', () => {
    jest.spyOn(JovoUserConfig.prototype, 'savePreset').mockReturnThis();
    jest.spyOn(JovoUserConfig.prototype, 'get').mockReturnValue({
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
  });
});

describe('getPreset()', () => {
  test('should return correct preset', () => {
    jest.spyOn(JovoUserConfig.prototype, 'savePreset').mockReturnThis();
    jest.spyOn(JovoUserConfig.prototype, 'get').mockReturnValue({
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

    const config: JovoUserConfig = new JovoUserConfig();
    const preset: Preset = config.getPreset('presetName');

    expect(preset).toBeDefined();
  });

  test('should fail if preset does not exist', () => {
    jest.spyOn(JovoUserConfig.prototype, 'savePreset').mockReturnThis();
    jest.spyOn(JovoUserConfig.prototype, 'get').mockReturnValue({
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
  });
});

describe('savePreset()', () => {
  // TODO: Mock promptForOVerwrite and test for overwriting presets.
  test('should save preset', async () => {
    jest.spyOn(JovoUserConfig.prototype, 'get').mockReturnValue({
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
    jest.spyOn(JovoUserConfig.prototype, 'save').mockReturnThis();

    const config: JovoUserConfig = new JovoUserConfig();
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
