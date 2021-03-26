import { Emitter, ActionSet } from '.';
import { EventHandler } from './EventHandler';
import { DefaultEvents, Events, JovoCliPluginConfig } from './utils';

export abstract class PluginHook<T extends Events = DefaultEvents> extends EventHandler {
  protected actionSet!: ActionSet<T & DefaultEvents>;
  protected $emitter!: Emitter<T & DefaultEvents>;
  protected $config!: JovoCliPluginConfig;

  /**
   * Abstract install function to hook into events.
   */
  abstract install(): void;
}
