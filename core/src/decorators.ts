import { checkForProjectDirectory, PluginCommand } from '.';

/**
 * Decorator that checks if the current working directory
 * is a Jovo project before executing the respective command
 */
export function ProjectCommand(): Function {
  return (command: typeof PluginCommand) => {
    const run = command.prototype.run;
    command.prototype.run = async function (this: PluginCommand): Promise<void> {
      checkForProjectDirectory(this.$cli.isInProjectDirectory());
      await run();
    }.bind(command.prototype);
  };
}

/**
 * This decorator has no logical body and executes no code,
 * however for consistency this can be used on commands
 * that can be used anywhere with jovov4
 */
export function GlobalCommand(): Function {
  return () => {};
}
