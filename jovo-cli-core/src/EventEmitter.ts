import { EventEmitter } from 'events';
import { Events } from './utils/Interfaces';

export declare interface Emitter<T extends Events = Events> {
  on<K extends keyof T>(event: K, listener: (v: T[K]) => void): this;
  off<K extends keyof T>(event: K, listener: (v: T[K]) => void): this;
}

export class Emitter<T extends Events> extends EventEmitter {
  /**
   * Calls each listener registered for event, in order of registration.
   * @param event - The event.
   * @param args - Possible arguments that get passed to all listener functions.
   * @deprecated Please use the async function run() instead.
   */
  emit<K extends keyof T>(event: K, ...args: T[K][]) {
    return super.emit(event as string, ...args);
  }

  listeners(event: string): Function[] {
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
  async run<K extends keyof T>(event: K, ...args: T[K][]) {
    const fns: Function[] = this.listeners(event as string).reverse();
    if (!fns) {
      return false;
    }

    for (let i = fns.length - 1; i >= 0; i--) {
      await fns[i](...args);
    }

    return true;
  }
}
