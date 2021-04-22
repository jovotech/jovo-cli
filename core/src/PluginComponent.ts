import { Emitter } from './EventEmitter';
import { JovoCliPlugin } from './JovoCliPlugin';
import { ActionSet, PluginConfig, PluginContext } from './utils/Interfaces';

export class PluginComponent {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected actionSet!: ActionSet<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected $emitter!: Emitter<any>;
  protected $plugin!: JovoCliPlugin;
  protected $config!: PluginConfig;
  protected $context!: PluginContext;

  static install(plugin: JovoCliPlugin, emitter: Emitter, config: PluginConfig): void {
    this.prototype.$plugin = plugin;
    this.prototype.$emitter = emitter;
    this.prototype.$config = config;

    // Load action set.
    this.prototype.install();
    // Register events to emitter.
    this.prototype.loadActionSet();
  }

  install(): void {}

  loadActionSet(): void {
    for (const [key, value] of Object.entries(this.actionSet || {})) {
      if (!value) {
        continue;
      }

      for (const fn of value) {
        this.$emitter.on(key, fn);
      }
    }
  }

  uninstall(): void {
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
