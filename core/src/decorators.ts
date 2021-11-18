import { checkForProjectDirectory, JovoCli, PluginCommand } from '.';

/**
 * Decorator that checks if the current working directory
 * is a Jovo project before executing the respective command
 */
export function ProjectCommand(): Function {
  return (command: typeof PluginCommand) => {
    if (
      process.argv.includes(command.id) &&
      !process.argv.includes('help') &&
      !process.argv.includes('--help')
    ) {
      const cli = new JovoCli();
      checkForProjectDirectory(cli.isInProjectDirectory());
    }
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
