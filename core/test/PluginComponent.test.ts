import { Emitter, JovoCliPlugin, PluginType } from '../src';
import { PluginComponent } from '../src/PluginComponent';
import { Plugin } from './__mocks__/plugins/Plugin';

beforeEach(() => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  delete PluginComponent.prototype['$config'];
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  delete PluginComponent.prototype['$emitter'];
});

describe('EventHandler.install()', () => {
  test('should set $plugin, $emitter and $config if not set already', () => {
    const mocked: jest.SpyInstance = jest
      .spyOn(PluginComponent.prototype, 'loadActionSet')
      .mockReturnThis();

    const eventHandler: PluginComponent = new PluginComponent();
    expect(eventHandler).not.toHaveProperty('$plugin');
    expect(eventHandler).not.toHaveProperty('$emitter');
    expect(eventHandler).not.toHaveProperty('$config');

    PluginComponent.install(new Plugin(), new Emitter(), {});

    expect(eventHandler).toHaveProperty('$plugin');
    expect(eventHandler).toHaveProperty('$emitter');
    expect(eventHandler).toHaveProperty('$config');

    mocked.mockRestore();
  });
});

describe('loadActionSet()', () => {
  test('should register an event', () => {
    const emitter: Emitter = new Emitter();
    class TestEventHandler extends PluginComponent {
      actionSet = {
        testEvent: [jest.fn()],
      };
      $emitter = emitter;
    }

    expect(emitter.listeners('testEvent')).toHaveLength(0);

    const eventHandler: TestEventHandler = new TestEventHandler();
    eventHandler.loadActionSet();

    expect(emitter.listeners('testEvent')).toHaveLength(1);
  });
});

describe('uninstall()', () => {
  test('should register an event', () => {
    const emitter: Emitter = new Emitter();
    const fn: jest.Mock = jest.fn();
    class TestEventHandler extends PluginComponent {
      actionSet = {
        testEvent: [fn],
      };
      $emitter = emitter;
    }

    emitter.on('testEvent', fn);
    expect(emitter.listeners('testEvent')).toHaveLength(1);

    const eventHandler: TestEventHandler = new TestEventHandler();
    eventHandler.uninstall();

    expect(emitter.listeners('testEvent')).toHaveLength(0);
  });
});
