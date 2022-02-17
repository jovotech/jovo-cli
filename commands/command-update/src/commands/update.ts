import {
  ANSWER_CANCEL,
  ARROW_UP,
  CliFlags,
  execAsync,
  flags,
  getOutdatedPackages,
  JovoCliError,
  Log,
  Package,
  PluginCommand,
  PluginContext,
  printPackages,
  printSubHeadline,
  ProjectCommand,
  SUCCESS,
  TADA,
  Task,
} from '@jovotech/cli-core';
import { promptUpdate } from '../utilities';

export interface UpdateContext extends PluginContext {
  flags: CliFlags<typeof Update>;
}

export type UpdateEvents = 'before.update' | 'update' | 'after.update';

@ProjectCommand()
export class Update extends PluginCommand<UpdateEvents> {
  static id = 'update';

  static description = 'Update all Jovo packages of the current project to their latest version';

  static flags = {
    yes: flags.boolean({
      char: 'y',
      description: 'Skip the prompt to update packages and run the update non-interactively',
    }),
    ...PluginCommand.flags,
  };

  static examples: string[] = ['jovo update'];

  $context!: UpdateContext;

  async run(): Promise<void> {
    Log.spacer();
    Log.info(`jovo update: ${Update.description}`);
    Log.info(printSubHeadline('Learn more: https://jovo.tech/docs/update-command'));

    const { flags } = this.parse(Update);

    this.$emitter.run('before.update');

    const outdatedPackages: Package[] = await getOutdatedPackages(/@jovotech\//);
    if (!outdatedPackages.length) {
      Log.info(`${SUCCESS} Nothing to do, everything up to date.`);
      Log.spacer();
      return;
    }

    Log.info('Updates available for the following Jovo packages:');
    Log.spacer();
    Log.info(printPackages(outdatedPackages));
    Log.spacer();

    if (!flags.yes) {
      const { update } = await promptUpdate();

      if (update === ANSWER_CANCEL) {
        return;
      }
    }

    const updateTask: Task = new Task(`${ARROW_UP} Updating Jovo packages`);

    const devPackages: string[] = [];
    const prodPackages: string[] = [];

    for (const pkg of outdatedPackages) {
      pkg.isDev ? devPackages.push(`${pkg.name}@latest`) : prodPackages.push(`${pkg.name}@latest`);
    }

    const updateProdDependenciesTask: Task = new Task(
      'Installing dependencies',
      async () => {
        try {
          const { stdout } = await execAsync(`npm i ${prodPackages.join(' ')} --log-level verbose`);
          return stdout;
        } catch (error) {
          throw new JovoCliError({ message: error.stderr });
        }
      },
      { enabled: Boolean(prodPackages.length) },
    );

    const updateDevDependenciesTask: Task = new Task(
      'Installing devDependencies',
      async () => {
        try {
          const { stdout } = await execAsync(`npm i ${devPackages.join(' ')} -D`);
          return stdout;
        } catch (error) {
          throw new JovoCliError({ message: error.stderr });
        }
      },
      { enabled: Boolean(devPackages.length) },
    );

    updateTask.add(updateProdDependenciesTask, updateDevDependenciesTask);
    await updateTask.run();

    this.$emitter.run('update');

    this.$emitter.run('after.update');

    Log.spacer();
    Log.info(`${TADA} Update completed.`);
    Log.spacer();
  }
}
