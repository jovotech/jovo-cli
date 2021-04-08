import { Plugin } from './Plugin';
import { Emitter } from './EventEmitter';
import { ActionSet, DefaultEvents, Events, PluginConfig } from './utils/Interfaces';

export abstract class PluginHook<T extends Events = DefaultEvents> extends Plugin {
  protected actionSet!: ActionSet<T & DefaultEvents>;
  protected $emitter!: Emitter<T & DefaultEvents>;
  
  /**
   * Abstract install function to hook into events.
   */
  abstract install(): void;
}
