// This import is necessary for inferred type annotation for PluginCommand.flags.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import * as Parser from '@oclif/parser';
import { existsSync, mkdirSync } from 'fs';
import {
  JovoCli,
  checkForProjectDirectory,
  PluginContext,
  PluginCommand,
  printSubHeadline,
  flags,
  Emitter,
  CliFlags,
  CliArgs,
  ParseContext,
  TADA,
  Log,
} from '@jovotech/cli-core';
import { BuildEvents } from '@jovotech/cli-command-build';
import GetCommand from '..';

export type GetArgs = CliArgs<typeof Get>;
export type GetFlags = CliFlags<typeof Get>;

export interface ParseContextGet extends ParseContext {
  args: GetArgs;
  flags: GetFlags;
}

export interface GetContext extends PluginContext {
  flags: CliFlags<typeof Get>;
  args: CliArgs<typeof Get>;
}

export type GetEvents = 'before.get' | 'get' | 'after.get';

export class Get extends PluginCommand<BuildEvents | GetEvents> {
  static id = 'get';
  static description = 'Downloads an existing platform project into the platforms folder.';
  static examples: string[] = [
    'jovo get alexaSkill --skill-id amzn1.ask.skill.xxxxxxxx',
    'jovo get googleAction --project-id testproject-xxxxxx',
  ];
  // Includes all available platforms, which will be initialized on install().
  static availablePlatforms: string[] = [];
  static flags = {
    locale: flags.string({
      char: 'l',
      description: 'Locale of the language model.\n<en|de|etc>',
      multiple: true,
    }),
    target: flags.string({
      char: 't',
      description: 'Target of build.',
      // ToDo: options: [TARGET_ALL, TARGET_INFO, TARGET_MODEL, TARGET_ZIP, ...deployTargets.getAllPluginTargets()],
    }),
    build: flags.boolean({
      description: 'Runs build after get.',
      char: 'b',
      dependsOn: ['reverse'],
    }),
    reverse: flags.boolean({
      char: 'r',
      description: 'Builds Jovo language model from platform specific language model.',
      dependsOn: ['build'],
    }),
    overwrite: flags.boolean({
      description: 'Forces overwrite of existing project.',
    }),
    ...PluginCommand.flags,
  };
  static args = [
    <const>{
      name: 'platform',
      description: 'Platform to get files from.',
      options: Get.availablePlatforms,
      required: true,
    },
  ];

  static install(cli: JovoCli, plugin: GetCommand, emitter: Emitter<GetEvents>): void {
    // Override PluginCommand.install() to fill options for --platform.
    this.availablePlatforms.push(...cli.getPlatforms());
    super.install(cli, plugin, emitter);
  }

  install(): void {
    this.middlewareCollection = {
      'before.get': [this.beforeGet.bind(this)],
    };
  }

  beforeGet(): void {
    // Create build/ folder depending on user config.
    const buildPath: string = this.$cli.$project!.getBuildPath();
    if (!existsSync(buildPath)) {
      mkdirSync(buildPath);
    }
  }

  async run(): Promise<void> {
    checkForProjectDirectory(this.$cli.isInProjectDirectory());

    const { args, flags }: Pick<ParseContextGet, 'flags' | 'args'> = this.parse(Get);

    await this.$emitter.run('parse', { command: Get.id, flags, args });

    Log.spacer();
    Log.info(`jovo get: ${Get.description}`);
    Log.info(printSubHeadline('Learn more: https://jovo.tech/docs/cli/get\n'));

    const context: GetContext = {
      command: Get.id,
      platforms: [args.platform],
      locales: flags.locale || this.$cli.$project!.getLocales(),
      flags,
      args,
    };
    this.$cli.setPluginContext(context);

    await this.$emitter.run('before.get');
    await this.$emitter.run('get');
    await this.$emitter.run('after.get');

    if (flags.build) {
      await this.$emitter.run('reverse.build');
    }

    Log.spacer();
    Log.info(`${TADA} Successfully got your platform project!`);
    Log.spacer();
  }
}
