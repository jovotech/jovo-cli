import { args as Args } from '@oclif/parser';
import { Input } from '@oclif/command/lib/flags';
import { join as joinPaths } from 'path';
import _merge from 'lodash.merge';
import _pick from 'lodash.pick';
import {
  ANSWER_CANCEL,
  checkForProjectDirectory,
  flags,
  JovoCliError,
  JovoCliPluginContext,
  MarketplacePlugin,
  PluginCommand,
  printHighlight,
  printSubHeadline,
  prompt,
  promptOverwrite,
  SPARKLES,
  Task,
  wait,
} from 'jovo-cli-core';
import { existsSync, readFileSync, writeFileSync, copyFileSync } from 'fs';

import { promptPlugins, insert, fetchMarketPlace, promptServer } from '../utils';

export interface NewStageEvents {
  'before.new:stage': JovoCliPluginContext;
  'new:stage': JovoCliPluginContext;
  'after.new:stage': JovoCliPluginContext;
}

export class NewStage extends PluginCommand<NewStageEvents> {
  static id: string = 'new:stage';
  // Prints out a description for this command.
  static description: string = 'Creates a new stage.';
  // Prints out examples for this command.
  static examples: string[] = [];
  // Defines flags for this command, such as --help.
  static flags: Input<any> = {
    overwrite: flags.boolean({
      description: 'Forces overwriting an existing project.',
    }),
  };
  // Defines arguments that can be passed to the command.
  static args: Args.Input = [
    {
      name: 'stage',
      description: 'Name of the stage.',
      required: true,
    },
  ];

  install() {
    this.actionSet = {
      'before.new:stage': [this.checkForExistingStage.bind(this)],
      'new:stage': [this.createNewStage.bind(this)],
    };
  }

  async checkForExistingStage(context: JovoCliPluginContext) {
    const appFileName: string = `app.${context.args.stage}.ts`;

    if (existsSync(joinPaths('src', appFileName)) && !context.flags.overwrite) {
      const { overwrite } = await promptOverwrite(
        `Stage ${printHighlight(
          context.args.stage,
        )} already exists. Do you want to overwrite it's files?`,
      );

      if (overwrite === ANSWER_CANCEL) {
        process.exit();
      }
    }
  }

  async createNewStage(context: JovoCliPluginContext) {
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

    const serverFileName: string = `server.${server}`;
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

    const stageTask: Task = new Task('Creating new stage...', async () => {
      // Create app.{stage}.ts.
      let stagedApp: string = readFileSync(joinPaths('__mocks__', 'app.stage.ts'), 'utf-8');
      const pluginsComment: string = '// Add Jovo plugins here.';

      for (const plugin of plugins) {
        stagedApp = insert(`import { ${plugin.module} } from '${plugin.package}'\n`, stagedApp, 0);
        stagedApp = insert(
          `\n\tnew ${plugin.module}(),`,
          stagedApp,
          stagedApp.indexOf(pluginsComment) + pluginsComment.length,
        );
      }

      stagedApp = insert(`\nexport * from './${serverFileName}';\n`, stagedApp, stagedApp.length);

      writeFileSync(joinPaths('src', `app.${context.args.stage}.ts`), stagedApp);
      await wait(500);
    });

    await stageTask.run();
  }

  async run() {
    checkForProjectDirectory();
    const { args, flags } = this.parse(NewStage);

    await this.$emitter!.run('parse', { command: NewStage.id, flags, args });

    console.log(`\n jovo new:stage: ${NewStage.description}`);
    console.log(printSubHeadline('Learn more: https://jovo.tech/docs/cli/new:stage\n'));

    const context: JovoCliPluginContext = {
      command: NewStage.id,
      platforms: [],
      locales: [],
      flags,
      args,
    };

    await this.$emitter.run('before.new:stage', context);
    await this.$emitter.run('new:stage', context);
    await this.$emitter.run('after.new:stage', context);

    console.log();
    console.log(`${SPARKLES} Successfully created a new stage. ${SPARKLES}`);
    console.log();
  }

  async catch(error: JovoCliError) {
    this.error(`There was a problem:\n${error}`);
  }
}
