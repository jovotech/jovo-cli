import { PluginComponent } from './PluginComponent';
import { EventEmitter } from './EventEmitter';
import { MiddlewareCollection, DefaultEvents, Events } from './interfaces';

export abstract class PluginHook<T extends Events = DefaultEvents> extends PluginComponent {
  middlewareCollection!: MiddlewareCollection<T | DefaultEvents>;
  $emitter!: EventEmitter<T | DefaultEvents>;

  /**
   * Abstract install function to hook into events.
   */
  abstract install(): void;
}
