import {
  ANSWER_CANCEL,
  CliArgs,
  CliFlags,
  Log,
  MarketplacePlugin,
  PluginCommand,
  PluginContext,
  printHighlight,
  printSubHeadline,
  printUserInput,
  prompt,
  promptOverwrite,
  ProjectCommand,
  TADA,
  Task,
  wait,
  WRENCH,
} from '@jovotech/cli-core';
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'fs';
import latestVersion from 'latest-version';
import _merge from 'lodash.merge';
import { join as joinPaths, resolve } from 'path';
import { Choice } from 'prompts';
import { promptPlugins, promptServer } from '../prompts';
import { fetchMarketPlace, insert, runNpmInstall } from '../utilities';

export interface NewStageContext extends PluginContext {
  args: CliArgs<typeof NewStage>;
  flags: CliFlags<typeof NewStage>;
}

export type NewStageEvents = 'before.new:stage' | 'new:stage' | 'after.new:stage';

@ProjectCommand()
export class NewStage extends PluginCommand<NewStageEvents> {
  static id = 'new:stage';
  static description = 'Create a new stage';
  static examples: string[] = [];
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

    if (existsSync(joinPaths('src', appFileName))) {
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

    const serverFileName: string | undefined = server
      ? `server.${server.module.toLowerCase()}`
      : undefined;

    // Offer the user a range of plugins consisting of database and analytics plugins.
    const availableAppPlugins: prompt.Choice[] = marketPlacePlugins
      .filter((plugin) => plugin.tags.includes('databases') || plugin.tags.includes('analytics'))
      .map((plugin) => {
        return {
          title: printUserInput(plugin.name),
          value: plugin,
          description: plugin.description,
        };
      });
    const { plugins: appPlugins } = await promptPlugins(
      'Which framework plugins do you want to use?',
      availableAppPlugins,
    );

    Log.spacer();
    const stageTask: Task = new Task(`${WRENCH} Creating new stage`);

    const addPluginsTask: Task = new Task('Generating staged files', async () => {
      // Create app.{stage}.ts.
      const appTask: Task = new Task(`app.${this.$context.args.stage}.ts`, async () => {
        let stagedApp: string = readFileSync(
          joinPaths('node_modules', '@jovotech', 'framework', 'boilerplate', 'app.stage.ts'),
          'utf-8',
        );
        const pluginsComment = '// Add Jovo plugins here';

        for (const plugin of appPlugins) {
          stagedApp = insert(
            `import { ${plugin.module} } from '${plugin.package}'\n`,
            stagedApp,
            0,
          );
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
      appTask.indent(4);
      await appTask.run();
    });

    const installTask: Task = new Task('Installing plugins', async () => {
      const packageJson = require(resolve('package.json'));

      // Add plugins to package.json
      for (const plugin of [...appPlugins]) {
        packageJson.dependencies[plugin.package] = await latestVersion(plugin.package);
      }
      // Add selected server dependency to package.json
      if (server) {
        packageJson.dependencies[server.package] = await latestVersion(server.package);
      }

      // Create new npm scripts
      const appStartPath: string[] = [`app.${this.$context.args.stage}.js`];
      if (this.$cli.project!.isTypeScriptProject()) {
        appStartPath.unshift('dist');
      } else {
        appStartPath.unshift('src');
      }
      const appBundlePath: string = joinPaths(
        'src',
        `app.${this.$context.args.stage}.${this.$cli.project!.isTypeScriptProject() ? 'ts' : 'js'}`,
      );

      packageJson.scripts[
        `start:${this.$context.args.stage}`
      ] = `tsc-watch --onSuccess \"node ${joinPaths(...appStartPath)} --jovo-webhook\"`;
      packageJson.scripts[
        `bundle:${this.$context.args.stage}`
      ] = `esbuild ${appBundlePath} --bundle --minify --sourcemap --platform=node --outfile=bundle/index.js`;

      writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
      await runNpmInstall('./');
    });

    stageTask.add(addPluginsTask, installTask);

    await stageTask.run();

    const serverFilePath: string | undefined = server
      ? joinPaths('src', `${serverFileName}.ts`)
      : undefined;
    Log.verbose(serverFilePath!);

    if (serverFilePath) {
      if (existsSync(serverFilePath)) {
        Log.spacer();
        const { overwrite } = await promptOverwrite(
          `${serverFilePath} already exists. Do you want to overwrite it?`,
        );

        if (overwrite === ANSWER_CANCEL) {
          return;
        }
      }

      copyFileSync(
        joinPaths('node_modules', server!.package, 'boilerplate', `${serverFileName}.ts`),
        serverFilePath,
      );
    }
  }

  async run(): Promise<void> {
    Log.spacer();
    Log.info(`jovo new:stage: ${NewStage.description}`);
    Log.info(printSubHeadline('Learn more: https://jovo.tech/docs/cli/new:stage'));
    Log.spacer();

    const { args, flags } = this.parse(NewStage);

    _merge(this.$context, { args, flags });

    await this.$emitter.run('before.new:stage');
    await this.$emitter.run('new:stage');
    await this.$emitter.run('after.new:stage');

    Log.spacer();
    Log.info(`${TADA} Successfully created a new stage.`);
    Log.spacer();
  }
}
