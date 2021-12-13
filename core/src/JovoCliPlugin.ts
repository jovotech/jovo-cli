import { Configurable } from '@jovotech/common';
import { JovoCli } from '.';
import { EventEmitter } from './EventEmitter';
import { PluginConfig, PluginContext, PluginType } from './interfaces';
import { Log } from './Logger';
import { PluginCommand } from './PluginCommand';
import { PluginHook } from './PluginHook';

export abstract class JovoCliPlugin<
  CONFIG extends PluginConfig = PluginConfig,
> extends Configurable<CONFIG> {
  abstract readonly type: PluginType;
  abstract readonly id: string;
  $cli!: JovoCli;
  $context!: PluginContext;

  getCommands(): typeof PluginCommand[] {
    return [];
  }

  getHooks(): typeof PluginHook[] {
    return [];
  }

  install(cli: JovoCli, emitter: EventEmitter, context: PluginContext): void {
    this.$cli = cli;
    this.$context = context;
    for (const plugin of [...this.getCommands(), ...this.getHooks()]) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      plugin.install(cli, this, emitter);
      plugin.prototype['$context'] = context;
    }
    Log.verbose(`Installed ${this.constructor.name}`, { indent: 2 });
  }

  getDefaultConfig(): CONFIG {
    return {} as CONFIG;
  }
}
