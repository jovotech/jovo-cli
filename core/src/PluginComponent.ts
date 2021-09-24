import { JovoCli } from '.';
import { EventEmitter } from './EventEmitter';
import { JovoCliPlugin } from './JovoCliPlugin';
import { MiddlewareCollection, PluginContext } from './interfaces';

export class PluginComponent {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  middlewareCollection!: MiddlewareCollection<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  $emitter!: EventEmitter<any>;
  $plugin!: JovoCliPlugin;
  $context!: PluginContext;
  $cli!: JovoCli;

  static install(cli: JovoCli, plugin: JovoCliPlugin, emitter: EventEmitter): void {
    this.prototype.$cli = cli;
    this.prototype.$plugin = plugin;
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
