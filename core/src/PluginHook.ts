import { PluginComponent } from './PluginComponent';
import { Emitter } from './EventEmitter';
import { MiddlewareCollection, DefaultEvents, Events } from './interfaces';

export abstract class PluginHook<T extends Events = DefaultEvents> extends PluginComponent {
  protected middlewareCollection!: MiddlewareCollection<T | DefaultEvents>;
  protected $emitter!: Emitter<T | DefaultEvents>;

  /**
   * Abstract install function to hook into events.
   */
  abstract install(): void;
}
