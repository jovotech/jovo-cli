import { JovoCli } from '.';
import { Emitter } from './EventEmitter';
import { JovoCliPlugin } from './JovoCliPlugin';
import { MiddlewareCollection, PluginConfig, PluginContext } from './utils/Interfaces';

export class PluginComponent {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected middlewareCollection!: MiddlewareCollection<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected $emitter!: Emitter<any>;
  protected $plugin!: JovoCliPlugin;
  protected $config!: PluginConfig;
  protected $context!: PluginContext;
  protected $cli!: JovoCli;

  static install(cli: JovoCli, plugin: JovoCliPlugin, emitter: Emitter): void {
    this.prototype.$cli = cli;
    this.prototype.$plugin = plugin;
    this.prototype.$config = plugin.$config;
    this.prototype.$emitter = emitter;

    // Load action set.
    this.prototype.install();
    // Register events to emitter.
    this.prototype.loadMiddlewareCollection();
  }

  install(): void {}

  loadMiddlewareCollection(): void {
    for (const [key, value] of Object.entries(this.middlewareCollection || {})) {
      if (!value) {
        continue;
      }

      for (const fn of value) {
        this.$emitter.on(key, fn);
      }
    }
  }

  uninstall(): void {
    for (const [key, value] of Object.entries(this.middlewareCollection || {})) {
      if (!value) {
        continue;
      }

      for (const fn of value) {
        this.$emitter.off(key, fn);
      }
    }
  }
}
