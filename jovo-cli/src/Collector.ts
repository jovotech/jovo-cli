import { Command, Plugin } from '@oclif/config';
import _merge from 'lodash.merge';
import {
  BaseCommand,
  DefaultEvents,
  Emitter,
  Hook,
  JovoCli,
  JovoCliPlugin,
} from 'jovo-cli-core';

export class Collector extends Plugin {
  get topics() {
    return [];
  }
  hooks = {};
  commands: Command.Plugin[] = [];

  async install(command: string) {
    const emitter = new Emitter<DefaultEvents>();

    await this.loadPlugins(command, emitter);
  }

  /**
   * Loads plugins from project and installs respective commands and hooks.
   * @param argCmd - The current command id passed from process.argv.
   * @param project - The instantiated project.
   * @param emitter - The Event Emitter.
   */
  async loadPlugins(argCmd: string, emitter: Emitter<DefaultEvents>) {
    const jovo: JovoCli = JovoCli.getInstance();
    const plugins: JovoCliPlugin[] = jovo.loadPlugins();

    for (const plugin of plugins) {
      // ToDo: Maybe better in Project.ts?
      // Merge existing plugin config with plugin-specific values.
      _merge(plugin.config, { pluginId: plugin.id, pluginType: plugin.type });

      // Install plugin hooks.
      const pluginHooks: Hook[] = plugin.getHooks();

      for (const PluginHook of pluginHooks) {
        // @ts-ignore
        const hook: Hook = new PluginHook(emitter, plugin.config);
        // Run abstract install() function, which initiates the hook's ActionSet.
        hook.install();
        // Register events declared in hook's ActionSet.
        hook.loadActionSet();
      }

      // Install plugin commands.
      const pluginCommands: typeof BaseCommand[] = plugin.getCommands();

      for (const PluginCommand of pluginCommands) {
        if (!argCmd || argCmd == 'help' || process.argv.includes('--help')) {
          // Execute static BaseCommand.install() function.
          const command = await PluginCommand.install(emitter, plugin.config);
          this.commands.push(command);
        } else if (PluginCommand.id === argCmd) {
          // Execute static BaseCommand.install() function.
          const command = await PluginCommand.install(emitter, plugin.config);
          this.commands = [command];
        }
      }
    }
  }
}
