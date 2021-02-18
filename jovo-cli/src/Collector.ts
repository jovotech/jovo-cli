import { Command, Plugin } from '@oclif/config';
import _merge from 'lodash.merge';
import {
  DefaultEvents,
  Emitter,
  JovoCli,
  JovoCliPlugin,
  PluginCommand,
  PluginHook,
} from 'jovo-cli-core';

export class Collector extends Plugin {
  get topics() {
    return [];
  }
  hooks = {};
  commands: Command.Plugin[] = [];

  async install() {
    const emitter = new Emitter<DefaultEvents>();

    await this.loadPlugins(emitter);
  }

  /**
   * Loads plugins from project and installs respective commands and hooks.
   * @param argCmd - The current command id passed from process.argv.
   * @param project - The instantiated project.
   * @param emitter - The Event Emitter.
   */
  async loadPlugins(emitter: Emitter<DefaultEvents>) {
    try {
      const jovo: JovoCli = JovoCli.getInstance();
      const plugins: JovoCliPlugin[] = jovo.loadPlugins();

      for (const plugin of plugins) {
        // ToDo: Maybe better in Project.ts?
        // Merge existing plugin config with plugin-specific values.
        _merge(plugin.config, { pluginId: plugin.id, pluginType: plugin.type });

        // Install plugin commands.
        const pluginCommands: typeof PluginCommand[] = plugin.getCommands();

        for (const PluginCommand of pluginCommands) {
          const command = await PluginCommand.install(emitter, plugin.config);
          this.commands.push(command);
        }

        // Install plugin hooks.
        const pluginHooks: typeof PluginHook[] = plugin.getHooks();

        for (const PluginHook of pluginHooks) {
          PluginHook.install(emitter, plugin.config);
        }
      }
    } catch (error) {
      console.log(`There was a problem:\n${error}`);
      process.exit();
    }
  }
}
