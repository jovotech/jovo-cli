import { Emitter, ActionSet } from '.';
import { EventHandler } from './EventHandler';
import { DefaultEvents, Events, JovoCliPluginConfig } from './utils';

export abstract class PluginHook<T extends Events = DefaultEvents> extends EventHandler {
  protected actionSet!: ActionSet<T & DefaultEvents>;
  protected $emitter!: Emitter<T & DefaultEvents>;
  protected $config!: JovoCliPluginConfig;

  static install(emitter: Emitter<Events>, config: JovoCliPluginConfig) {
    if (!this.prototype.$emitter) {
      this.prototype.$emitter = emitter;
    }

    if (!this.prototype.$config) {
      this.prototype.$config = config;
    }

    // Load action set.
    this.prototype.install();
    // Register events to emitter.
    this.prototype.loadActionSet();
  }

  /**
   * Abstract install function to hook into events.
   */
  abstract install(): void;
}
