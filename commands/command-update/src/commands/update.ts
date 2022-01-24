import {
  ANSWER_CANCEL,
  ARROW_UP,
  CliFlags,
  execAsync,
  getOutdatedPackages,
  JovoCliError,
  Log,
  Package,
  PluginCommand,
  PluginContext,
  printOutdatedPackages,
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

  static description =
    'Start the local development server and test your app using the Jovo Debugger';

  static examples: string[] = ['jovo update'];

  $context!: UpdateContext;

  async run(): Promise<void> {
    Log.spacer();
    Log.info(`jovo update: ${Update.description}`);
    Log.info(printSubHeadline('Learn more: https://jovo.tech/docs/cli/update\n'));

    this.$emitter.run('before.update');

    const outdatedPackages: Package[] = await getOutdatedPackages(/@jovotech\//);
    if (!outdatedPackages.length) {
      Log.info(`${SUCCESS} Nothing to do, everything up to date.`);
      Log.spacer();
      return;
    }

    const { update } = await promptUpdate(outdatedPackages);

    if (update === ANSWER_CANCEL) {
      return;
    }

    Log.spacer();

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
