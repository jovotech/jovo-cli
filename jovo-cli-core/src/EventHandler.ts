import { ActionSet, Emitter } from '.';

export class EventHandler {
  protected actionSet?: ActionSet<any>;
  protected $emitter!: Emitter<any>;

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
        this.$emitter!.off(key, fn);
      }
    }
  }
}
