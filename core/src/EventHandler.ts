import { Emitter } from './EventEmitter';
import { ActionSet, Events, PluginConfig } from './utils/Interfaces';

export class EventHandler {
  protected actionSet?: ActionSet<any>;
  protected $emitter!: Emitter<any>;
  protected $config!: PluginConfig;

  static install(emitter: Emitter<Events>, config: PluginConfig) {
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

  install() {}

  loadActionSet() {
    for (const [key, value] of Object.entries(this.actionSet || {})) {
      if (!value) {
        continue;
      }

      for (const fn of value) {
        this.$emitter.on(key, fn);
      }
    }
  }

  uninstall() {
    for (const [key, value] of Object.entries(this.actionSet || {})) {
      if (!value) {
        continue;
      }

      for (const fn of value) {
        this.$emitter.off(key, fn);
      }
    }
  }
}
