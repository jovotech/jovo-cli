import { EventEmitter } from '../src';

describe('new Emitter<T>()', () => {
  // * This test tests type safety, thus does not need to be run.
  test.skip('should instantiate the emitter and give type safety', () => {
    type T = 'Foo1';
    type K = 'Foo2';
    const emitter: EventEmitter<T | K> = new EventEmitter<T | K>();

    emitter.on('Foo1', () => {});
    emitter.on('Foo2', () => {});
    emitter.off('Foo1', () => {});
    emitter.off('Foo2', () => {});
    emitter.run('Foo1', 'Bar1');
    emitter.run('Foo2', 'Bar2');
  });
});

describe('off()', () => {
  test('should successfully remove an event', () => {
    const emitter: EventEmitter = new EventEmitter();

    const fn: jest.Mock = jest.fn();
    emitter.on('event', fn);
    expect(emitter.listeners('event')).toHaveLength(1);
    emitter.off('event', fn);
    expect(emitter.listeners('event')).toHaveLength(0);
  });
});

describe('on()', () => {
  test('should successfully add an event', () => {
    const emitter: EventEmitter = new EventEmitter();
    expect(emitter.listeners('event')).toHaveLength(0);

    const fn: (v: unknown) => void = () => {};
    emitter.on('event', fn);

    expect(emitter.listeners('event')).toHaveLength(1);
    expect(emitter.listeners('event')[0]).toStrictEqual(fn);
  });
});

describe('run()', () => {
  test('should successfully run a synchronous event', () => {
    const emitter: EventEmitter = new EventEmitter();

    const fn: jest.Mock = jest.fn();
    emitter.on('event', fn);
    emitter.run('event');

    expect(fn).toBeCalledTimes(1);
  });

  test('should successfully pass parameters to functions', () => {
    const emitter: EventEmitter = new EventEmitter();

    const fn: jest.Mock = jest.fn();
    emitter.on('event', fn);
    emitter.run('event', 'Foo');

    expect(fn).toBeCalledTimes(1);
    expect(fn).toBeCalledWith('Foo');
  });

  test('should successfully run an asynchronous event', async () => {
    const emitter: EventEmitter = new EventEmitter();

    const promise: Promise<void> = new Promise((res) => {
      res();
    });
    const fn: jest.Mock = jest.fn().mockImplementation(() => promise);
    emitter.on('event', fn);
    await emitter.run('event');

    expect(fn).toBeCalledTimes(1);
    expect(fn).toReturn();
    expect(fn).toReturnWith<Promise<void>>(promise);
  });
});
