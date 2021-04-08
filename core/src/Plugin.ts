import _get from 'lodash.get';
import { Emitter } from './EventEmitter';
import { JovoCliPlugin } from './JovoCliPlugin';
import { ActionSet, PluginConfig, PluginContext } from './utils/Interfaces';

export class Plugin {
  protected actionSet!: ActionSet<any>;
  protected $emitter!: Emitter<any>;
  protected $plugin!: JovoCliPlugin;
  protected $config!: PluginConfig;
  protected $context!: PluginContext;

  static install(plugin: JovoCliPlugin, emitter: Emitter, config: PluginConfig) {
    if (!this.prototype.$plugin) {
      this.prototype.$plugin = plugin;
    }

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

  /**
   * Returns platform-specific resolved locales.
   * @param locale - Locale for which to return resolved locales.
   */
  protected getResolvedLocales(locale: string): string[] {
    const resolvedLocales: string[] | undefined = _get(this.$config, `locales["${locale}"]`);

    if (resolvedLocales) {
      const globPattern: string | undefined = resolvedLocales.find((locale) =>
        /[a-zA-Z]{2}-\*/.test(locale),
      );

      if (globPattern) {
        const genericLocale: string = globPattern.replace('-*', '');

        return this.$plugin.supportedLocales.filter((locale) => locale.includes(genericLocale));
      }
    }

    return [locale];
  }
}
