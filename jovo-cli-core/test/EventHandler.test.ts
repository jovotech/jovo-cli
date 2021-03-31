import { Emitter } from '../src';
import { EventHandler } from '../src/EventHandler';

beforeEach(() => {
  // @ts-ignore
  delete EventHandler.prototype['$config'];
  // @ts-ignore
  delete EventHandler.prototype['$emitter'];
});

describe('EventHandler.install()', () => {
  test('should set $emitter and $config if not set already', () => {
    const mocked: jest.SpyInstance = jest
      .spyOn(EventHandler.prototype, 'loadActionSet')
      .mockReturnThis();

    const eventHandler: EventHandler = new EventHandler();
    expect(eventHandler).not.toHaveProperty('$emitter');
    expect(eventHandler).not.toHaveProperty('$config');

    EventHandler.install(new Emitter(), {});

    expect(eventHandler).toHaveProperty('$emitter');
    expect(eventHandler).toHaveProperty('$config');

    mocked.mockRestore();
  });
});

describe('loadActionSet()', () => {
  test('should register an event', () => {
    const emitter: Emitter = new Emitter();
    class TestEventHandler extends EventHandler {
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
    const fn: jest.Mock = jest.fn();
    class TestEventHandler extends EventHandler {
      actionSet = {
        testEvent: [fn],
      };
    }

    const emitter: Emitter = new Emitter();
    emitter.on('testEvent', fn);
    expect(emitter.listeners('testEvent')).toHaveLength(1);

    const eventHandler: TestEventHandler = new TestEventHandler();
    eventHandler.uninstall();

    expect(emitter.listeners('testEvent')).toHaveLength(1);
  });
});
