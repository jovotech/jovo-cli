import { Command } from '@oclif/config';
import { DefaultEvents, Emitter } from '@jovotech/cli-core';

export interface CommandClass {
  id: string;
  install(emittter: Emitter<any>): Promise<Command.Plugin>;
}

export interface PluginClass {
  new (emitter: Emitter<DefaultEvents>): this;
  install(): void;
  uninstall(): void;
}
