import { Emitter, ActionSet } from '.';
import { DefaultEvents, Events, JovoCliPluginConfig } from './utils';

export abstract class Hook<T extends Events = DefaultEvents> {
  actionSet: ActionSet<T & DefaultEvents> = {};

  constructor(
    protected $emitter: Emitter<T & DefaultEvents>,
    protected $config: JovoCliPluginConfig,
  ) {}

  /**
   * Abstract install function to hook into events.
   */
  abstract install(): void;

  loadActionSet() {
    for (const [key, value] of Object.entries(this.actionSet)) {
      if (!value) {
        continue;
      }

      for (const fn of value) {
        this.$emitter.on(key, fn);
      }
    }
  }

  uninstall() {
    for (const [key, value] of Object.entries(this.actionSet)) {
      if (!value) {
        continue;
      }

      for (const fn of value) {
        this.$emitter.off(key, fn);
      }
    }
  }
}
