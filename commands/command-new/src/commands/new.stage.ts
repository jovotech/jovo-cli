// This import is necessary for inferred type annotation for PluginCommand.flags.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import * as Parser from '@oclif/parser';
import { join as joinPaths, resolve } from 'path';
import {
  ANSWER_CANCEL,
  checkForProjectDirectory,
  flags,
  PluginContext,
  PluginCommand,
  printHighlight,
  printSubHeadline,
  prompt,
  promptOverwrite,
  Task,
  wait,
  WRENCH,
  JovoCli,
  CliFlags,
  CliArgs,
  ParseContext,
  TADA,
} from '@jovotech/cli-core';
import { existsSync, readFileSync, writeFileSync, copyFileSync } from 'fs';
import latestVersion from 'latest-version';

import {
  promptPlugins,
  insert,
  fetchMarketPlace,
  promptServer,
  runNpmInstall,
  linkPlugins,
} from '../utils';

export type NewStageArgs = CliArgs<typeof NewStage>;
export type NewStageFlags = CliFlags<typeof NewStage>;

export interface NewStageContext extends PluginContext {
  args: NewStageArgs;
  flags: NewStageFlags;
}

export interface ParseContextNewStage extends ParseContext {
  args: NewStageArgs;
  flags: NewStageFlags;
}

export type NewStageEvents = 'before.new:stage' | 'new:stage' | 'after.new:stage';

export class NewStage extends PluginCommand<NewStageEvents> {
  static id = 'new:stage';
  // Prints out a description for this command.
  static description = 'Creates a new stage.';
  // Prints out examples for this command.
  static examples: string[] = [];
  // Defines flags for this command, such as --help.
  static flags = {
    overwrite: flags.boolean({
      description: 'Forces overwriting an existing project.',
    }),
  };
  // Defines arguments that can be passed to the command.
  static args = [
    <const>{
      name: 'stage',
      description: 'Name of the stage.',
      required: true,
    },
  ];

  $context!: NewStageContext;

  install(): void {
    this.actionSet = {
      'before.new:stage': [this.checkForExistingStage.bind(this)],
      'new:stage': [this.createNewStage.bind(this)],
    };
  }

  async checkForExistingStage(): Promise<void> {
    const appFileName = `app.${this.$context.args.stage}.ts`;

    if (existsSync(joinPaths('src', appFileName)) && !this.$context.flags.overwrite) {
      const { overwrite } = await promptOverwrite(
        `Stage ${printHighlight(
          this.$context.args.stage,
        )} already exists. Do you want to overwrite it's files?`,
      );

      if (overwrite === ANSWER_CANCEL) {
        process.exit();
      }
    }
  }

  async createNewStage(): Promise<void> {
    const servers: prompt.Choice[] = [
      {
        title: 'Express',
        value: 'express',
        description: 'ExpressJS webhook',
      },
      {
        title: 'AWS Lambda',
        value: 'lambda',
        description: 'Serverless hosting solution by Amazon Web Services',
      },
    ];
    const { server } = await promptServer(servers);

    const serverFileName = `server.${server}`;
    copyFileSync(
      joinPaths('__mocks__', `${serverFileName}.ts`),
      joinPaths('src', `${serverFileName}.ts`),
    );

    // Offer the user a range of plugins consisting of database and analytics plugins.
    const availablePlugins: prompt.Choice[] = fetchMarketPlace()
      .filter((plugin) => plugin.tags.includes('databases') || plugin.tags.includes('analytics'))
      .map((plugin) => {
        return {
          title: plugin.name,
          description: plugin.description,
          value: plugin,
        };
      });

    const { plugins } = await promptPlugins(availablePlugins);

    console.log();
    const stageTask: Task = new Task(`${WRENCH} Creating new stage...`);

    const addPluginsTask: Task = new Task('Generating staged files', async () => {
      // Create app.{stage}.ts.
      let stagedApp: string = readFileSync(joinPaths('__mocks__', 'app.stage.ts'), 'utf-8');
      const pluginsComment = '// Add Jovo plugins here.';

      for (const plugin of plugins) {
        stagedApp = insert(`import { ${plugin.module} } from '${plugin.package}'\n`, stagedApp, 0);
        stagedApp = insert(
          `\n\t\tnew ${plugin.module}(),`,
          stagedApp,
          stagedApp.indexOf(pluginsComment) + pluginsComment.length,
        );
      }

      stagedApp = insert(`\nexport * from './${serverFileName}';\n`, stagedApp, stagedApp.length);

      writeFileSync(joinPaths('src', `app.${this.$context.args.stage}.ts`), stagedApp);
      await wait(500);
    });

    const installTask: Task = new Task('Installing plugins', async () => {
      const packageJson = require(resolve('package.json'));
      for (const plugin of plugins) {
        packageJson.dependencies[plugin.npmPackage] = await latestVersion(plugin.npmPackage);
      }
      writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
      await runNpmInstall('./');
      await linkPlugins();
    });
    stageTask.add(addPluginsTask, installTask);

    await stageTask.run();
  }

  async run(): Promise<void> {
    checkForProjectDirectory();
    const { args, flags }: Pick<ParseContextNewStage, 'args' | 'flags'> = this.parse(NewStage);

    await this.$emitter.run('parse', { command: NewStage.id, flags, args });

    console.log(`\n jovo new:stage: ${NewStage.description}`);
    console.log(printSubHeadline('Learn more: https://jovo.tech/docs/cli/new:stage\n'));

    const jovo: JovoCli = JovoCli.getInstance();
    const context: NewStageContext = {
      command: NewStage.id,
      platforms: jovo.getPlatforms(),
      locales: jovo.$project!.getLocales(),
      flags,
      args,
    };
    jovo.setPluginContext(context);

    await this.$emitter.run('before.new:stage');
    await this.$emitter.run('new:stage');
    await this.$emitter.run('after.new:stage');

    console.log();
    console.log(`${TADA} Successfully created a new stage. ${TADA}`);
    console.log();
  }
}
