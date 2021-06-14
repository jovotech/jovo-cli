import { Events } from './interfaces';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type EventListener = (...v: any[]) => void;

export class EventEmitter<T extends Events = Events> {
  private events: { [key: string]: EventListener[] } = {};

  listeners<K extends T>(event: K): Function[] {
    return this.events[event] || [];
  }

  addListener<K extends T>(event: K, listener: EventListener): this {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
    return this;
  }

  on<K extends T>(event: K, listener: EventListener): this {
    return this.addListener(event, listener);
  }

  removeListener<K extends T>(event: K, listener: EventListener): this {
    const listeners: EventListener[] = this.events[event];
    for (let i = 0; i < listeners.length; i++) {
      if (listeners[i] === listener) {
        listeners.splice(i, 1);
        break;
      }
    }
    return this;
  }

  off<K extends T>(event: K, listener: EventListener): this {
    return this.removeListener(event, listener);
  }

  /**
   * Calls each listener registered for event, in order of registration and synchronously.
   * @param event - The event.
   * @param args - Possible arguments that get passed to all listener functions.
   */
  async run<K extends T>(event: K, ...args: unknown[]): Promise<boolean> {
    const fns: Function[] = this.listeners(event);
    if (!fns.length) {
      return false;
    }

    while (fns.length) {
      const fn: Function = fns.shift()!;
      await fn(...args);
    }

    return true;
  }
}
