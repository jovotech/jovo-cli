import { EventEmitter, JovoCli, PluginCommand, PluginContext } from '../src';
import { Plugin } from './__mocks__/plugins/Plugin';

afterEach(() => {
  jest.restoreAllMocks();
});

describe('new JovoCliPlugin()', () => {
  test('should instantiate a plugin with a default config', () => {
    const plugin: Plugin = new Plugin();
    expect(plugin.config).toStrictEqual({});
  });

  test('should instantiate a plugin with a provided config', () => {
    const plugin: Plugin = new Plugin({ files: { foo: 'bar' } });
    expect(plugin.config).toStrictEqual({ files: { foo: 'bar' } });
  });
});

describe('getCommands()', () => {
  test('should return an empty array by default', () => {
    const plugin: Plugin = new Plugin();
    expect(plugin.getCommands()).toHaveLength(0);
  });
});

describe('getHooks()', () => {
  test('should return an empty array by default', () => {
    const plugin: Plugin = new Plugin();
    expect(plugin.getHooks()).toHaveLength(0);
  });
});

describe('install()', () => {
  test('should do nothing if no commands/hooks are provided', () => {
    const spiedInstall: jest.SpyInstance = jest.spyOn(Plugin.prototype, 'install');
    const plugin: Plugin = new Plugin();
    plugin.install(new JovoCli(), new EventEmitter(), { command: 'test' });
    expect(spiedInstall).toReturn();
  });

  test('should call install on every command/hook provided', () => {
    class Command extends PluginCommand {
      run(): Promise<unknown> {
        throw new Error('Method not implemented.');
      }
    }
    Command.install = jest.fn();

    const plugin: Plugin = new Plugin();
    plugin.getCommands = function () {
      return [Command];
    };
    const emitter: EventEmitter = new EventEmitter();
    const cli: JovoCli = new JovoCli();
    plugin.install(cli, emitter, { command: 'test' });

    expect(Command.install).toBeCalledTimes(1);
    expect(Command.install).toBeCalledWith(cli, plugin, emitter);
  });

  test('should pass context to every command/hook provided', () => {
    class Command extends PluginCommand {
      run(): Promise<unknown> {
        throw new Error('Method not implemented.');
      }
    }
    Command.install = jest.fn();

    const plugin: Plugin = new Plugin();
    plugin.getCommands = function () {
      return [Command];
    };
    const emitter: EventEmitter = new EventEmitter();
    const cli: JovoCli = new JovoCli();
    const context: PluginContext = {
      command: 'test',
    };
    plugin.install(cli, emitter, context);

    expect(Command.prototype['$context']).toStrictEqual(context);
  });
});

describe('getDefaultConfig()', () => {
  test('should return an empty config object', () => {
    const plugin: Plugin = new Plugin();
    expect(plugin.getDefaultConfig()).toStrictEqual({});
  });
});
