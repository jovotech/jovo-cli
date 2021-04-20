import * as Config from '@oclif/config';
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
  PluginConfig,
  CliFlags,
  CliArgs,
  ParseContext,
  TADA,
} from '@jovotech/cli-core';
import { BuildEvents } from '@jovotech/cli-command-build';
import GetCommand from '..';

const jovo: JovoCli = JovoCli.getInstance();

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
    stage: flags.string({
      description: 'Takes configuration from specified stage.',
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
  };
  static args = [
    <const>{
      name: 'platform',
      description: 'Platform to get files from.',
      options: Get.availablePlatforms,
      required: true,
    },
  ];

  static async install(
    plugin: GetCommand,
    emitter: Emitter<GetEvents>,
    config: PluginConfig,
  ): Promise<Config.Command.Plugin> {
    // Override PluginCommand.install() to fill options for --platform.
    this.availablePlatforms.push(...jovo.getPlatforms());
    return super.install(plugin, emitter, config);
  }

  install(): void {
    this.actionSet = {
      'before.get': [this.beforeGet.bind(this)],
    };
  }

  beforeGet(): void {
    // Create build/ folder depending on user config.
    const buildPath: string = jovo.$project!.getBuildPath();
    if (!existsSync(buildPath)) {
      mkdirSync(buildPath);
    }
  }

  async run(): Promise<void> {
    checkForProjectDirectory();

    const { args, flags }: Pick<ParseContextGet, 'flags' | 'args'> = this.parse(Get);

    await this.$emitter.run('parse', { command: Get.id, flags, args });

    console.log();
    console.log(`jovo get: ${Get.description}`);
    console.log(printSubHeadline('Learn more: https://jovo.tech/docs/cli/get\n'));

    const context: GetContext = {
      command: Get.id,
      platforms: [args.platform],
      locales: flags.locale || jovo.$project!.getLocales(),
      flags,
      args,
    };
    jovo.setPluginContext(context);

    await this.$emitter.run('before.get');
    await this.$emitter.run('get');
    await this.$emitter.run('after.get');

    if (flags.build) {
      await this.$emitter.run('reverse.build');
    }

    console.log();
    console.log(`${TADA} Successfully got your platform project! ${TADA}`);
    console.log();
  }
}
