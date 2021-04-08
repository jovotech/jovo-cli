import { Command, Plugin } from '@oclif/config';
import _merge from 'lodash.merge';
import {
  DefaultEvents,
  Emitter,
  JovoCli,
  ConfigHooks,
  JovoCliPlugin,
  PluginCommand,
  PluginHook,
} from '@jovotech/cli-core';

export class Collector extends Plugin {
  get topics() {
    return [];
  }
  hooks = {};
  commands: Command.Plugin[] = [];

  async install(commandId: string) {
    const emitter = new Emitter<DefaultEvents>();

    await this.loadPlugins(commandId, emitter);
  }

  /**
   * Loads plugins from project and installs respective commands and hooks.
   * @param argCmd - The current command id passed from process.argv.
   * @param project - The instantiated project.
   * @param emitter - The Event Emitter.
   */
  async loadPlugins(commandId: string, emitter: Emitter<DefaultEvents>) {
    try {
      const jovo: JovoCli = JovoCli.getInstance();
      const plugins: JovoCliPlugin[] = jovo.loadPlugins();

      for (const plugin of plugins) {
        // Install plugin commands.
        const pluginCommands: typeof PluginCommand[] = plugin.getCommands();

        for (const pluginCommand of pluginCommands) {
          const command = await pluginCommand.install(plugin, emitter, plugin.config);

          // Move the command currently being executed to the beginning.
          if (pluginCommand.id === commandId) {
            this.commands.unshift(command);
          } else {
            this.commands.push(command);
          }
        }

        // Install plugin hooks.
        const pluginHooks: typeof PluginHook[] = plugin.getHooks();

        for (const pluginHook of pluginHooks) {
          pluginHook.install(plugin, emitter, plugin.config);
        }
      }

      // Load hooks from project configuration.
      if (jovo.isInProjectDirectory()) {
        const hooks: ConfigHooks = jovo.$project!.$config.getParameter('hooks') as ConfigHooks;
        if (hooks) {
          for (const [eventKey, events] of Object.entries(hooks)) {
            for (const event of events) {
              // @ts-ignore
              emitter.on(eventKey, event);
            }
          }
        }
      }

      if (!this.commands.length) {
        return;
      }

      // Run install middleware for currently executed command.
      const { id: command, flags, args } = this.commands[0];
      await emitter.run('install', {
        command,
        flags,
        args,
      });
    } catch (error) {
      console.log(`There was a problem:\n${error}`);
      process.exit();
    }
  }
}
