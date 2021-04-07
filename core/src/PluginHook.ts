import { EventHandler } from './EventHandler';
import { Emitter } from './EventEmitter';
import { ActionSet, DefaultEvents, Events, PluginConfig } from './utils/Interfaces';

export abstract class PluginHook<T extends Events = DefaultEvents> extends EventHandler {
  protected actionSet!: ActionSet<T & DefaultEvents>;
  protected $emitter!: Emitter<T & DefaultEvents>;
  protected $config!: PluginConfig;

  /**
   * Abstract install function to hook into events.
   */
  abstract install(): void;
}
