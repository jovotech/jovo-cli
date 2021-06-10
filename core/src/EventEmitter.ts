import { EventEmitter } from 'events';
import { Events } from './interfaces';

export declare interface Emitter<T extends Events = Events> {
  on<K extends T>(event: K, listener: (...v: unknown[]) => void): this;
  off<K extends T>(event: K, listener: (...v: unknown[]) => void): this;
}

export class Emitter<T extends Events = Events> extends EventEmitter {
  static defaultMaxListeners: number = 0;
  /**
   * Calls each listener registered for event, in order of registration.
   * @param event - The event.
   * @param args - Possible arguments that get passed to all listener functions.
   * @deprecated Please use the async function run() instead.
   */
  emit<K extends T>(event: K, ...args: unknown[]): boolean {
    return super.emit(event, ...args);
  }

  listeners<K extends T>(event: K): Function[] {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const events: Function[] | Function | undefined = this._events[event];
    if (!events) {
      return [];
    }

    if (typeof events === 'function') {
      return [events];
    } else {
      return events;
    }
  }

  /**
   * Calls each listener registered for event, in order of registration and synchronously.
   * @param event - The event.
   * @param args - Possible arguments that get passed to all listener functions.
   */
  async run<K extends T>(event: K, ...args: unknown[]): Promise<boolean> {
    const fns: Function[] = this.listeners(event);
    if (!fns) {
      return false;
    }

    while (fns.length) {
      const fn: Function = fns.shift()!;
      await fn(...args);
    }

    return true;
  }
}
