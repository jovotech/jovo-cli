import { Plugin } from './__mocks__/plugins/Plugin';

describe('new JovoCliPlugin()', () => {
  test('should instantiate a plugin with a default config', () => {
    const plugin: Plugin = new Plugin();
    expect(plugin.$config).toStrictEqual({});
  });

  test('should instantiate a plugin with a provided config', () => {
    const plugin: Plugin = new Plugin({ files: { foo: 'bar' } });
    expect(plugin.$config).toStrictEqual({ files: { foo: 'bar' } });
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
  test('should do nothing if no commands/hooks are provided', () => {});

  test('should call install on every ');
});

describe('setPluginContext()', () => {});
