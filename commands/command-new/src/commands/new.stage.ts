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
  CliFlags,
  CliArgs,
  ParseContext,
  TADA,
  printUserInput,
  MarketplacePlugin,
  Log,
} from '@jovotech/cli-core';
import { existsSync, readFileSync, writeFileSync, copyFileSync } from 'fs';
import latestVersion from 'latest-version';
import { Choice } from 'prompts';

import { promptPlugins, insert, fetchMarketPlace, promptServer, runNpmInstall } from '../utils';

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
    this.middlewareCollection = {
      'before.new:stage': [this.checkForExistingStage.bind(this)],
      'new:stage': [this.createNewStage.bind(this)],
    };
  }

  /**
   * Checks if a stage exists already.
   */
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

  /**
   * Creates a new stage. Installs selected plugins and writes corresponding files.
   */
  async createNewStage(): Promise<void> {
    const marketPlacePlugins: MarketplacePlugin[] = fetchMarketPlace();

    // Let the user choose between available server integrations.
    const servers: Choice[] = marketPlacePlugins
      .filter((plugin) => plugin.tags.includes('server'))
      .map((plugin) => ({
        title: printUserInput(plugin.name),
        value: plugin,
        description: plugin.description,
      }));
    const { server } = await promptServer(servers);
    const serverFileName = `server.${server.module.toLowerCase()}`;

    // Offer the user a range of plugins consisting of database and analytics plugins.
    const availablePlugins: prompt.Choice[] = marketPlacePlugins
      .filter((plugin) => plugin.tags.includes('databases') || plugin.tags.includes('analytics'))
      .map((plugin) => {
        return {
          title: printUserInput(plugin.name),
          value: plugin,
          description: plugin.description,
        };
      });
    const { plugins } = await promptPlugins(availablePlugins);

    Log.spacer();
    const stageTask: Task = new Task(`${WRENCH} Creating new stage...`);

    const addPluginsTask: Task = new Task('Generating staged files', async () => {
      // Create app.{stage}.ts.
      let stagedApp: string = readFileSync(
        joinPaths('node_modules', '@jovotech', 'framework', 'boilerplate', 'app.stage.ts'),
        'utf-8',
      );
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

      // Add plugins to package.json
      for (const plugin of plugins) {
        packageJson.dependencies[plugin.package] = await latestVersion(plugin.package);
      }
      // Add selected server dependency to package.json
      packageJson.dependencies[server.package] = await latestVersion(server.package);

      // Create new npm scripts
      const appStartPath: string[] = [`app.${this.$context.args.stage}.js`];
      if (this.$cli.$project!.isTypeScriptProject()) {
        appStartPath.unshift('dist');
      } else {
        appStartPath.unshift('src');
      }
      const appBundlePath: string = joinPaths(
        'src',
        `app.${this.$context.args.stage}.${
          this.$cli.$project!.isTypeScriptProject() ? 'ts' : 'js'
        }`,
      );

      packageJson.scripts[
        `start:${this.$context.args.stage}`
      ] = `tsc-watch --onSuccess \"node ${joinPaths(...appStartPath)} --jovo-webhook\"`;
      packageJson.scripts[
        `bundle:${this.$context.args.stage}`
      ] = `ncc build ${appBundlePath} -ms -o bundle/ --target es2020 && bestzip bundle.zip bundle/*`;

      writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
      await runNpmInstall('./');

      copyFileSync(
        joinPaths('node_modules', server.package, 'boilerplate', `${serverFileName}.ts`),
        joinPaths('src', `${serverFileName}.ts`),
      );
    });

    stageTask.add(addPluginsTask, installTask);

    await stageTask.run();
  }

  async run(): Promise<void> {
    checkForProjectDirectory(this.$cli.isInProjectDirectory());
    const { args, flags }: Pick<ParseContextNewStage, 'args' | 'flags'> = this.parse(NewStage);

    await this.$emitter.run('parse', { command: NewStage.id, flags, args });

    Log.spacer();
    Log.info(`jovo new:stage: ${NewStage.description}`);
    Log.info(printSubHeadline('Learn more: https://jovo.tech/docs/cli/new:stage'));
    Log.spacer();

    const context: NewStageContext = {
      command: NewStage.id,
      platforms: this.$cli.getPlatforms(),
      locales: this.$cli.$project!.getLocales(),
      flags,
      args,
    };
    this.$cli.setPluginContext(context);

    await this.$emitter.run('before.new:stage');
    await this.$emitter.run('new:stage');
    await this.$emitter.run('after.new:stage');

    Log.spacer();
    Log.info(`${TADA} Successfully created a new stage.`);
    Log.spacer();
  }
}
