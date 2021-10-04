import { EventEmitter, JovoCli } from '../src';
import { PluginComponent } from '../src/PluginComponent';
import { Plugin } from './__mocks__/plugins/Plugin';

beforeEach(() => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  delete PluginComponent.prototype['config'];
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  delete PluginComponent.prototype['$emitter'];
});

describe('EventHandler.install()', () => {
  test('should set $plugin, $emitter and config if not set already', () => {
    const mocked: jest.SpyInstance = jest
      .spyOn(PluginComponent.prototype, 'loadMiddlewareCollection')
      .mockReturnThis();

    const eventHandler: PluginComponent = new PluginComponent();
    expect(eventHandler).not.toHaveProperty('$plugin');
    expect(eventHandler).not.toHaveProperty('$emitter');

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    PluginComponent.install(new JovoCli(), new Plugin(), new EventEmitter());

    expect(eventHandler).toHaveProperty('$plugin');
    expect(eventHandler).toHaveProperty('$emitter');

    mocked.mockRestore();
  });
});

describe('loadMiddlewareCollection()', () => {
  test('should register an event', () => {
    const emitter: EventEmitter = new EventEmitter();
    class TestEventHandler extends PluginComponent {
      middlewareCollection = {
        testEvent: [jest.fn()],
      };
      $emitter = emitter;
    }

    expect(emitter.listeners('testEvent')).toHaveLength(0);

    const eventHandler: TestEventHandler = new TestEventHandler();
    eventHandler.loadMiddlewareCollection();

    expect(emitter.listeners('testEvent')).toHaveLength(1);
  });
});

describe('uninstall()', () => {
  test('should register an event', () => {
    const emitter: EventEmitter = new EventEmitter();
    const fn: jest.Mock = jest.fn();
    class TestEventHandler extends PluginComponent {
      middlewareCollection = {
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
