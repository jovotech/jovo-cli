import { args as Args } from '@oclif/parser';
import { Input } from '@oclif/command/lib/flags';
import { join as joinPaths } from 'path';
import _merge from 'lodash.merge';
import _pick from 'lodash.pick';
import {
  ANSWER_CANCEL,
  checkForProjectDirectory,
  CRYSTAL_BALL,
  deleteFolderRecursive,
  flags,
  JovoCli,
  JovoCliError,
  JovoCliPluginContext,
  JovoCliPreset,
  MarketplacePlugin,
  PluginCommand,
  printHighlight,
  printSubHeadline,
  ProjectProperties,
  prompt,
  promptOverwrite,
  STAR,
  TARGET_ALL,
  Task,
  WRENCH,
} from 'jovo-cli-core';
import { BuildEvents } from 'jovo-cli-command-build';
import { DeployEvents, DeployPluginContext } from 'jovo-cli-command-deploy';
import { copySync, writeFile } from 'fs-extra';
import { existsSync, mkdirSync, readFileSync, rmdirSync, symlinkSync, writeFileSync } from 'fs';

import {
  runNpmInstall,
  promptPreset,
  promptPresetName,
  promptProjectProperties,
  promptSavePreset,
  TemplateBuilder,
  promptServer,
  promptPlugins,
  insert,
  fetchMarketPlace,
} from '../utils';

const jovo: JovoCli = JovoCli.getInstance();

export interface NewStageEvents {
  'before.new:stage': JovoCliPluginContext;
}

// Extend JovoCliPluginContext with ProjectProperties.
export interface NewPluginContext
  extends JovoCliPluginContext,
    Omit<ProjectProperties, 'name' | 'key'> {}

export interface NewEvents {
  'before.new': NewPluginContext;
  'new': NewPluginContext;
  'after.new': NewPluginContext;
}

export class NewStage extends PluginCommand<NewStageEvents> {
  static id: string = 'new:stage';
  // Prints out a description for this command.
  static description: string = 'Creates a new stage.';
  // Prints out examples for this command.
  static examples: string[] = [];
  // Defines flags for this command, such as --help.
  static flags: Input<any> = {};
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
    };
  }

  async checkForExistingStage(context: JovoCliPluginContext) {
    const appFileName: string = `app.${context.args.stage}.ts`;

    if (existsSync(joinPaths('src', appFileName))) {
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

  async run() {
    checkForProjectDirectory();
    const { args, flags } = this.parse(NewStage);

    await this.$emitter!.run('parse', { command: NewStage.id, flags, args });

    this.log(`\n jovo new:stage: ${NewStage.description}`);
    this.log(printSubHeadline('Learn more: https://jovo.tech/docs/cli/new:stage\n'));

    const context: JovoCliPluginContext = {
      command: NewStage.id,
      platforms: [],
      locales: [],
      flags,
      args,
    };

    await this.$emitter.run('before.new:stage', context);

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
    copySync(
      joinPaths('__mocks__', `${serverFileName}.ts`),
      joinPaths('src', `${serverFileName}.ts`),
    );

    // Create app.{stage}.ts.
    const marketPlacePlugins: MarketplacePlugin[] = fetchMarketPlace();
    const availablePlugins: prompt.Choice[] = marketPlacePlugins.map((plugin) => ({
      title: plugin.name,
      description: plugin.description,
      value: plugin,
    }));

    const { plugins } = await promptPlugins(availablePlugins);

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
  }

  async catch(error: JovoCliError) {
    this.error(`There was a problem:\n${error}`);
  }
}
