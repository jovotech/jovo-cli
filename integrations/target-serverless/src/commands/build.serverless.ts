import { DeployCodeEvents } from '@jovotech/cli-command-deploy';
import {
  ANSWER_CANCEL,
  checkForProjectDirectory,
  deleteFolderRecursive,
  flags,
  Log,
  PluginCommand,
  printSubHeadline,
  promptOverwrite,
  TADA,
  Task,
  wait,
} from '@jovotech/cli-core';
import { existsSync, unlinkSync, writeFileSync } from 'fs';
import yaml from 'yaml';

export class BuildServerless extends PluginCommand<DeployCodeEvents> {
  static id = 'build:serverless';
  static description = 'Build serverless configuration file.';
  static examples: string[] = ['jovo build:serverless'];
  static flags = {
    clean: flags.boolean({
      description:
        'Deletes all platform folders and executes a clean build. If --platform is specified, it deletes only the respective platforms folder.',
    }),
    deploy: flags.boolean({
      char: 'd',
      description: 'Runs deploy after build.',
      exclusive: ['reverse'],
    }),
    ...PluginCommand.flags,
  };

  async run(): Promise<void> {
    checkForProjectDirectory(this.$cli.isInProjectDirectory());

    Log.spacer();
    Log.info(`jovo build:serverless: ${BuildServerless.description}`);
    Log.info(printSubHeadline('Learn more: https://jovo.tech/marketplace/target-serverless'));
    Log.spacer();

    const { flags } = this.parse(BuildServerless);

    if (existsSync('serverless.yaml')) {
      if (!flags.clean) {
        const { overwrite } = await promptOverwrite(
          'Serverless configuration already exists? Do you want to overwrite it?',
        );

        if (overwrite === ANSWER_CANCEL) {
          process.exit();
        }
      }

      deleteFolderRecursive('.serverless');
      unlinkSync('serverless.yaml');
    }

    /**
     * Builds the serverless.yaml file.
     */
    const buildTask: Task = new Task('Generating serverless.yaml', async () => {
      writeFileSync('serverless.yaml', yaml.stringify(this.$plugin.config));
      await wait(500);
      return '>> ./serverless.yaml';
    });
    await buildTask.run();

    if (flags.deploy) {
      await this.$emitter.run('before.deploy:code');
      await this.$emitter.run('deploy:code');
      await this.$emitter.run('after.deploy:code');
    }

    Log.spacer();
    Log.info(`${TADA} Successfully built serverless configuration.`);
    Log.spacer();
  }
}
