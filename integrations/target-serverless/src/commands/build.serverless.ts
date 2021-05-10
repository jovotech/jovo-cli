import * as Parser from '@oclif/parser';
import {
  ANSWER_CANCEL,
  checkForProjectDirectory,
  CliArgs,
  CliFlags,
  deleteFolderRecursive,
  flags,
  PluginCommand,
  PluginContext,
  printSubHeadline,
  promptOverwrite,
  TADA,
  Task,
  wait,
} from '@jovotech/cli-core';
import { existsSync, unlinkSync, writeFileSync } from 'fs';
import yaml from 'yaml';
import { DeployCodeEvents } from '@jovotech/cli-command-deploy';

export type BuildServerlessArgs = CliArgs<typeof BuildServerless>;
export type BuildServerlessFlags = CliFlags<typeof BuildServerless>;

export interface BuildServerlessContext extends PluginContext {
  args: BuildServerlessArgs;
  flags: BuildServerlessFlags;
}

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
    stage: flags.string({
      description: 'Takes configuration from specified stage.',
    }),
  };
  static args = [];

  async run(): Promise<void> {
    checkForProjectDirectory(this.$cli.isInProjectDirectory());

    const { args, flags } = this.parse(BuildServerless);

    await this.$emitter.run('parse', { command: BuildServerless.id, flags, args });

    console.log();
    console.log(`jovo build:serverless: ${BuildServerless.description}`);
    // ToDo: Link to correct docs.
    console.log(printSubHeadline('Learn more: https://jovo.tech/docs/cli/build\n'));

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
      writeFileSync('serverless.yaml', yaml.stringify(this.$plugin.$config));
      await wait(500);
      return '>> ./serverless.yaml';
    });
    await buildTask.run();

    if (flags.deploy) {
      const context: any = {
        command: BuildServerless.id,
        platforms: this.$cli.getPlatforms(),
        locales: this.$cli.$project!.getLocales(),
        target: 'serverless',
        flags,
        args,
      };
      this.$cli.setPluginContext(context);
      await this.$emitter.run('before.deploy:code');
      await this.$emitter.run('deploy:code');
      await this.$emitter.run('after.deploy:code');
    }

    console.log();
    console.log(`${TADA} Successfully built serverless configuration.`);
    console.log();
  }
}
