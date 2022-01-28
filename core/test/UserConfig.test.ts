import fs from 'fs';
import { homedir } from 'os';
import { join as joinPaths } from 'path';
import { PlainObjectType, Preset, UserConfig } from '../src';

const mockedConfigPath: string = '/path/to/config';

jest.mock('os', () => ({
  ...Object.assign({}, jest.requireActual('os')),
  homedir() {
    return joinPaths('/path/to/homedir/');
  },
}));

afterEach(() => {
  jest.restoreAllMocks();
});

describe('new UserConfig()', () => {
  test('should load the current config', () => {
    const mockedWebhookUuid: string = '1234test';

    jest.spyOn(UserConfig.prototype, 'load').mockReturnValue({
      cli: {
        plugins: ['@jovotech/cli-command-update'],
        presets: [
          {
            name: 'default',
            projectName: '',
            locales: [],
            language: 'typescript',
            platforms: [],
          },
        ],
      },
      webhook: { uuid: mockedWebhookUuid },
    });

    const config: UserConfig = new UserConfig();
    expect(config.webhook).toBeDefined();
    expect(config.webhook).toHaveProperty('uuid');
    expect(config.webhook.uuid).toMatch(mockedWebhookUuid);
  });

  test('should update config to v4 if v3 has been loaded and rename the original "config" to "config3"', () => {
    const mockedWebhookUuid: string = '1234test';

    const mockedRenameSync: jest.SpyInstance = jest.spyOn(fs, 'renameSync').mockReturnThis();
    jest.spyOn(fs, 'existsSync').mockReturnValue(false);
    const mockedLoad: jest.SpyInstance = jest
      .spyOn(UserConfig.prototype, 'load')
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      .mockReturnValueOnce({
        webhook: { uuid: mockedWebhookUuid },
      })
      .mockReturnValue({
        cli: {
          plugins: ['@jovotech/cli-command-update'],
          presets: [
            {
              name: 'default',
              projectName: '',
              locales: [],
              language: 'typescript',
              platforms: [],
            },
          ],
        },
        webhook: { uuid: mockedWebhookUuid },
      });
    jest.spyOn(UserConfig, 'getPath').mockReturnValue(mockedConfigPath);

    const config: UserConfig = new UserConfig();

    expect(mockedLoad).toBeCalledTimes(2);
    expect(mockedRenameSync).toBeCalledTimes(1);
    expect(mockedRenameSync).toBeCalledWith(
      joinPaths(homedir(), mockedConfigPath),
      joinPaths(homedir(), mockedConfigPath),
    );
    expect(config.webhook).toBeDefined();
    expect(config.webhook).toHaveProperty('uuid');
    expect(config.webhook.uuid).toMatch(mockedWebhookUuid);
  });

  test('should update config to v4 if v3 has been loaded, rename the original "config" to "config3" and "configv4" to "config"', () => {
    const mockedWebhookUuid: string = '1234test';

    const mockedRenameSync: jest.SpyInstance = jest.spyOn(fs, 'renameSync').mockReturnThis();
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    const mockedLoad: jest.SpyInstance = jest
      .spyOn(UserConfig.prototype, 'load')
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      .mockReturnValueOnce({
        webhook: { uuid: mockedWebhookUuid },
      })
      .mockReturnValue({
        cli: {
          plugins: ['@jovotech/cli-command-update'],
          presets: [
            {
              name: 'default',
              projectName: '',
              locales: [],
              language: 'typescript',
              platforms: [],
            },
          ],
        },
        webhook: { uuid: mockedWebhookUuid },
      });
    jest.spyOn(UserConfig, 'getPath').mockReturnValue(mockedConfigPath);

    const config: UserConfig = new UserConfig();

    expect(mockedLoad).toBeCalledTimes(2);
    expect(mockedRenameSync).toBeCalledTimes(2);
    expect(mockedRenameSync.mock.calls).toEqual([
      [joinPaths(homedir(), mockedConfigPath), joinPaths(homedir(), mockedConfigPath)],
      [joinPaths(homedir(), '.jovo', 'configv4'), joinPaths(homedir(), mockedConfigPath)],
    ]);
    expect(config.webhook).toBeDefined();
    expect(config.webhook).toHaveProperty('uuid');
    expect(config.webhook.uuid).toMatch(mockedWebhookUuid);
  });

  test("should create a new default preset if it doesn't exist", () => {
    const mockedWebhookUuid: string = '1234test';

    jest.spyOn(UserConfig.prototype, 'load').mockReturnValue({
      cli: {
        plugins: ['@jovotech/cli-command-update'],
        presets: [],
      },
      webhook: { uuid: mockedWebhookUuid },
    });
    const mockedGetDefaultPreset: jest.SpyInstance = jest
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .spyOn(UserConfig.prototype as any, 'getDefaultPreset')
      .mockReturnValue({ name: 'default' });
    const mockedSavePreset: jest.SpyInstance = jest
      .spyOn(UserConfig.prototype, 'savePreset')
      .mockReturnThis();

    const config: UserConfig = new UserConfig();

    expect(mockedGetDefaultPreset).toBeCalledTimes(1);
    expect(mockedSavePreset).toBeCalledTimes(1);
    expect(mockedSavePreset).toBeCalledWith({ name: 'default' });
    expect(config.webhook).toBeDefined();
    expect(config.webhook).toHaveProperty('uuid');
    expect(config.webhook.uuid).toMatch(mockedWebhookUuid);
  });
});

describe('UserConfig.getInstance()', () => {
  beforeEach(() => {
    delete UserConfig['instance'];
  });

  test('should return instance of ProjectConfig', () => {
    const mockedWebhookUuid: string = '1234test';

    const mockedLoad: jest.SpyInstance = jest.spyOn(UserConfig.prototype, 'load').mockReturnValue({
      cli: {
        plugins: ['@jovotech/cli-command-update'],
        presets: [
          { name: 'default', projectName: '', locales: [], language: 'typescript', platforms: [] },
        ],
      },
      webhook: { uuid: mockedWebhookUuid },
    });

    expect(UserConfig['instance']).not.toBeDefined();

    const config: UserConfig = UserConfig.getInstance();

    expect(UserConfig['instance']).toBeDefined();
    expect(mockedLoad).toBeCalledTimes(1);
    expect(config.webhook).toBeDefined();
    expect(config.webhook).toHaveProperty('uuid');
    expect(config.webhook.uuid).toMatch(mockedWebhookUuid);
  });

  test('should not return instance of ProjectConfig if one exists already', () => {
    const mockedWebhookUuid: string = '1234test';

    const mockedLoad: jest.SpyInstance = jest.spyOn(UserConfig.prototype, 'load').mockReturnValue({
      cli: {
        plugins: ['@jovotech/cli-command-update'],
        presets: [
          { name: 'default', projectName: '', locales: [], language: 'typescript', platforms: [] },
        ],
      },
      webhook: { uuid: mockedWebhookUuid },
    });

    expect(UserConfig['instance']).not.toBeDefined();

    const config1: UserConfig = UserConfig.getInstance();
    const config2: UserConfig = UserConfig.getInstance();

    expect(UserConfig['instance']).toBeDefined();
    expect(mockedLoad).toBeCalledTimes(1);
    expect(config1.webhook).toBeDefined();
    expect(config1.webhook).toHaveProperty('uuid');
    expect(config1.webhook.uuid).toMatch(mockedWebhookUuid);
    expect(config1).toStrictEqual(config2);
  });
});

describe('UserConfig.getPath()', () => {
  test('should return path for v4', () => {
    expect(UserConfig.getPath('v4')).toMatch(joinPaths('.jovo', 'config'));
    expect(UserConfig.getPath()).toMatch(joinPaths('.jovo', 'config'));
  });

  test('should return path for v3', () => {
    expect(UserConfig.getPath('v3')).toMatch(joinPaths('.jovo', 'config3'));
  });
});

describe('load()', () => {
  test('should read and return config', () => {
    const mockedWebhookUuid: string = '1234test';

    const mockedReadFileSync: jest.SpyInstance = jest
      .spyOn(fs, 'readFileSync')
      .mockReturnValue(`{ "webhook": { "uuid": "${mockedWebhookUuid}" } }`);
    jest.spyOn(UserConfig.prototype, 'load').mockReturnValueOnce({
      cli: {
        plugins: ['@jovotech/cli-command-update'],
        presets: [
          { name: 'default', projectName: '', locales: [], language: 'typescript', platforms: [] },
        ],
      },
      webhook: { uuid: mockedWebhookUuid },
    });
    jest.spyOn(UserConfig, 'getPath').mockReturnValue(mockedConfigPath);

    const config: UserConfig = new UserConfig();
    const configContent: PlainObjectType<UserConfig> = config.load();

    expect(mockedReadFileSync).toBeCalledTimes(1);
    expect(mockedReadFileSync).toBeCalledWith(joinPaths(homedir(), mockedConfigPath), 'utf-8');
    expect(configContent).toHaveProperty('webhook');
    expect(configContent.webhook).toHaveProperty('uuid');
    expect(configContent.webhook.uuid).toMatch(mockedWebhookUuid);
  });

  test('should create a new config, if it cannot be found', () => {
    const mockedWebhookUuid: string = '1234test';

    const mockedReadFileSync: jest.SpyInstance = jest
      .spyOn(fs, 'readFileSync')
      .mockImplementation(() => {
        class SomeError extends Error {
          code: string = 'ENOENT';
        }
        throw new SomeError();
      });
    jest.spyOn(UserConfig.prototype, 'load').mockReturnValueOnce({
      cli: {
        plugins: ['@jovotech/cli-command-update'],
        presets: [
          { name: 'default', projectName: '', locales: [], language: 'typescript', platforms: [] },
        ],
      },
      webhook: { uuid: mockedWebhookUuid },
    });
    jest.spyOn(UserConfig, 'getPath').mockReturnValue(mockedConfigPath);
    const mockedCreate: jest.SpyInstance = jest
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .spyOn(UserConfig.prototype as any, 'create')
      .mockReturnValue({ webhook: { uuid: mockedWebhookUuid } });

    const config: UserConfig = new UserConfig();
    const configContent: PlainObjectType<UserConfig> = config.load();

    expect(mockedReadFileSync).toBeCalledTimes(1);
    expect(mockedReadFileSync).toBeCalledWith(joinPaths(homedir(), mockedConfigPath), 'utf-8');
    expect(mockedCreate).toBeCalledTimes(1);
    expect(configContent).toHaveProperty('webhook');
    expect(configContent.webhook).toHaveProperty('uuid');
    expect(configContent.webhook.uuid).toMatch(mockedWebhookUuid);
  });

  test('should throw an error if something went wrong while parsing the config', () => {
    const mockedWebhookUuid: string = '1234test';

    jest.spyOn(fs, 'readFileSync').mockReturnValue(`{ invalid`);
    jest.spyOn(UserConfig.prototype, 'load').mockReturnValueOnce({
      cli: {
        plugins: ['@jovotech/cli-command-update'],
        presets: [
          { name: 'default', projectName: '', locales: [], language: 'typescript', platforms: [] },
        ],
      },
      webhook: { uuid: mockedWebhookUuid },
    });
    jest.spyOn(UserConfig, 'getPath').mockReturnValue(mockedConfigPath);

    const config: UserConfig = new UserConfig();
    expect(config.load.bind(config)).toThrow(`Error while trying to parse ${mockedConfigPath}.`);
  });
});

describe('save()', () => {
  test('should create .jovo/ folder if it does not exist', () => {
    const mockedWebhookUuid: string = '1234test';
    const mockedConfig: PlainObjectType<UserConfig> = {
      webhook: {
        uuid: 'test12345',
      },
      cli: {
        plugins: ['@jovotech/cli-command-update'],
        presets: [],
      },
    };

    const mockedMkdirSync: jest.SpyInstance = jest.spyOn(fs, 'mkdirSync').mockReturnThis();
    const mockedWriteFileSync: jest.SpyInstance = jest.spyOn(fs, 'writeFileSync').mockReturnThis();
    jest.spyOn(fs, 'existsSync').mockReturnValue(false);

    jest.spyOn(UserConfig.prototype, 'load').mockReturnValueOnce({
      cli: {
        plugins: ['@jovotech/cli-command-update'],
        presets: [
          { name: 'default', projectName: '', locales: [], language: 'typescript', platforms: [] },
        ],
      },
      webhook: { uuid: mockedWebhookUuid },
    });
    jest.spyOn(UserConfig, 'getPath').mockReturnValue(mockedConfigPath);

    const config: UserConfig = new UserConfig();
    config.save(mockedConfig);

    expect(mockedMkdirSync).toBeCalledTimes(1);
    expect(mockedMkdirSync).toBeCalledWith(joinPaths(homedir(), '.jovo'));
    expect(mockedWriteFileSync).toBeCalledTimes(1);
    expect(mockedWriteFileSync).toBeCalledWith(
      joinPaths(homedir(), mockedConfigPath),
      JSON.stringify(mockedConfig, null, 2),
    );
    expect(config).toHaveProperty('webhook');
    expect(config.webhook).toHaveProperty('uuid');
    expect(config.webhook.uuid).toMatch(mockedConfig.webhook.uuid);
  });

  test('should save the new config', () => {
    const mockedWebhookUuid: string = '1234test';
    const mockedConfig: PlainObjectType<UserConfig> = {
      webhook: {
        uuid: 'test12345',
      },
      cli: {
        plugins: ['@jovotech/cli-command-update'],
        presets: [],
      },
    };

    const mockedWriteFileSync: jest.SpyInstance = jest.spyOn(fs, 'writeFileSync').mockReturnThis();
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);

    jest.spyOn(UserConfig.prototype, 'load').mockReturnValueOnce({
      cli: {
        plugins: ['@jovotech/cli-command-update'],
        presets: [
          { name: 'default', projectName: '', locales: [], language: 'typescript', platforms: [] },
        ],
      },
      webhook: { uuid: mockedWebhookUuid },
    });
    jest.spyOn(UserConfig, 'getPath').mockReturnValue(mockedConfigPath);

    const config: UserConfig = new UserConfig();
    config.save(mockedConfig);

    expect(mockedWriteFileSync).toBeCalledTimes(1);
    expect(mockedWriteFileSync).toBeCalledWith(
      joinPaths(homedir(), mockedConfigPath),
      JSON.stringify(mockedConfig, null, 2),
    );
    expect(config).toHaveProperty('webhook');
    expect(config.webhook).toHaveProperty('uuid');
    expect(config.webhook.uuid).toMatch(mockedConfig.webhook.uuid);
  });
});

describe('create()', () => {
  test('should create config', () => {
    jest.spyOn(UserConfig.prototype, 'load').mockReturnValueOnce({
      cli: {
        plugins: ['@jovotech/cli-command-update'],
        presets: [
          { name: 'default', projectName: '', locales: [], language: 'typescript', platforms: [] },
        ],
      },
      webhook: { uuid: '' },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jest.spyOn(UserConfig.prototype as any, 'getDefaultPreset').mockReturnThis();
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    jest.spyOn(fs, 'writeFileSync').mockReturnThis();

    const config: UserConfig = new UserConfig();
    const createdConfig: PlainObjectType<UserConfig> = config['create']();

    expect(createdConfig).toHaveProperty('cli');
    expect(createdConfig.cli).toHaveProperty('plugins');
    expect(createdConfig.cli.plugins).toHaveLength(6);
  });

  test("should create config folder if it doesn't exist", () => {
    jest.spyOn(UserConfig.prototype, 'load').mockReturnValueOnce({
      cli: {
        plugins: ['@jovotech/cli-command-update'],
        presets: [
          { name: 'default', projectName: '', locales: [], language: 'typescript', platforms: [] },
        ],
      },
      webhook: { uuid: '' },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jest.spyOn(UserConfig.prototype as any, 'getDefaultPreset').mockReturnThis();
    jest.spyOn(fs, 'existsSync').mockReturnValue(false);
    jest.spyOn(fs, 'writeFileSync').mockReturnThis();
    const mockedMkdirSync: jest.SpyInstance = jest.spyOn(fs, 'mkdirSync').mockReturnThis();

    const config: UserConfig = new UserConfig();
    const createdConfig: PlainObjectType<UserConfig> = config['create']();

    expect(mockedMkdirSync).toBeCalledTimes(1);
    expect(createdConfig).toHaveProperty('cli');
    expect(createdConfig.cli).toHaveProperty('plugins');
    expect(createdConfig.cli.plugins).toHaveLength(6);
  });
});

describe('getParameter()', () => {
  test('should return webhook uuid', () => {
    const mockedWebhookUuid: string = '1234test';
    jest.spyOn(UserConfig.prototype, 'load').mockReturnValueOnce({
      cli: {
        plugins: ['@jovotech/cli-command-update'],
        presets: [
          { name: 'default', projectName: '', locales: [], language: 'typescript', platforms: [] },
        ],
      },
      webhook: { uuid: mockedWebhookUuid },
    });

    const config: UserConfig = new UserConfig();

    expect(config.getParameter('webhook.uuid')).toMatch(mockedWebhookUuid);
  });

  test('should return undefined for a nonexisting property', () => {
    const mockedWebhookUuid: string = '1234test';
    jest.spyOn(UserConfig.prototype, 'load').mockReturnValueOnce({
      cli: {
        plugins: ['@jovotech/cli-command-update'],
        presets: [
          { name: 'default', projectName: '', locales: [], language: 'typescript', platforms: [] },
        ],
      },
      webhook: { uuid: mockedWebhookUuid },
    });

    const config: UserConfig = new UserConfig();

    expect(config.getParameter('undefinedProperty')).toBeUndefined();
  });
});

describe('getWebhookUuid()', () => {
  test('should return webhook uuid', () => {
    const mockedWebhookUuid: string = '1234test';
    jest.spyOn(UserConfig.prototype, 'load').mockReturnValueOnce({
      cli: {
        plugins: ['@jovotech/cli-command-update'],
        presets: [
          { name: 'default', projectName: '', locales: [], language: 'typescript', platforms: [] },
        ],
      },
      webhook: { uuid: '' },
    });
    const mockedGetParameter: jest.SpyInstance = jest
      .spyOn(UserConfig.prototype, 'getParameter')
      .mockReturnValue(mockedWebhookUuid);

    const config: UserConfig = new UserConfig();
    const webhookUuid: string = config.getWebhookUuid();

    expect(mockedGetParameter).toBeCalledTimes(1);
    expect(mockedGetParameter).toBeCalledWith('webhook.uuid');
    expect(webhookUuid).toBeDefined();
    expect(webhookUuid).toMatch(mockedWebhookUuid);
  });
});

describe('getPresets()', () => {
  test('should return presets', () => {
    jest.spyOn(UserConfig.prototype, 'load').mockReturnValueOnce({
      cli: {
        plugins: ['@jovotech/cli-command-update'],
        presets: [
          { name: 'default', projectName: '', locales: [], language: 'typescript', platforms: [] },
        ],
      },
      webhook: { uuid: '' },
    });
    const mockedGetParameter: jest.SpyInstance = jest
      .spyOn(UserConfig.prototype, 'getParameter')
      .mockReturnValue([{ name: 'default' }]);

    const config: UserConfig = new UserConfig();
    const presets: Preset[] = config.getPresets();

    expect(mockedGetParameter).toBeCalledTimes(1);
    expect(mockedGetParameter).toBeCalledWith('cli.presets');
    expect(presets).toBeDefined();
    expect(presets).toHaveLength(1);
    expect(presets[0]).toHaveProperty('name');
    expect(presets[0].name).toMatch('default');
  });
});

describe('getPreset()', () => {
  test('should return correct preset', () => {
    jest.spyOn(UserConfig.prototype, 'load').mockReturnValueOnce({
      cli: {
        plugins: ['@jovotech/cli-command-update'],
        presets: [
          { name: 'default', projectName: '', locales: [], language: 'typescript', platforms: [] },
        ],
      },
      webhook: { uuid: '' },
    });
    jest
      .spyOn(UserConfig.prototype, 'getPresets')
      .mockReturnValue([
        { name: 'testPreset', projectName: '', platforms: [], language: 'typescript', locales: [] },
      ]);

    const config: UserConfig = new UserConfig();
    const preset: Preset = config.getPreset('testPreset');

    expect(preset).toBeDefined();
    expect(preset).toHaveProperty('name');
    expect(preset.name).toMatch('testPreset');
  });

  test('should fail if preset does not exist', () => {
    jest.spyOn(UserConfig.prototype, 'load').mockReturnValueOnce({
      cli: {
        plugins: ['@jovotech/cli-command-update'],
        presets: [
          { name: 'default', projectName: '', locales: [], language: 'typescript', platforms: [] },
        ],
      },
      webhook: { uuid: '' },
    });
    jest.spyOn(UserConfig.prototype, 'getPresets').mockReturnValue([]);

    const config: UserConfig = new UserConfig();

    expect(config.getPreset.bind(config, 'testPreset')).toThrow(
      'Could not find preset testPreset.',
    );
  });
});

describe('savePreset()', () => {
  test('should save preset', async () => {
    jest.spyOn(UserConfig.prototype, 'load').mockReturnValueOnce({
      cli: {
        plugins: ['@jovotech/cli-command-update'],
        presets: [
          { name: 'default', projectName: '', locales: [], language: 'typescript', platforms: [] },
        ],
      },
      webhook: { uuid: '' },
    });
    jest.spyOn(UserConfig.prototype, 'getPresets').mockReturnValue([]);
    jest.spyOn(UserConfig.prototype, 'save').mockReturnThis();

    const config: UserConfig = new UserConfig();
    const preset: Preset = {
      name: 'testPreset',
      projectName: '',
      platforms: [],
      locales: [],
      language: 'typescript',
    };
    await config.savePreset(preset);
    expect(config.cli.presets).toHaveLength(2);
    expect(config.cli.presets[0].name).toMatch('default');
    expect(config.cli.presets[1].name).toMatch('testPreset');
  });
});
