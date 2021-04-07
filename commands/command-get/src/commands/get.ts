import * as Config from '@oclif/config';
import { Input } from '@oclif/command/lib/flags';
import { existsSync, mkdirSync } from 'fs';
import {
  JovoCli,
  checkForProjectDirectory,
  JovoCliError,
  PluginContext,
  PluginCommand,
  printSubHeadline,
  flags,
  Emitter,
  PluginConfig,
  localeReducer,
} from '@jovotech/cli-core';
import { BuildEvents } from '@jovotech/cli-command-build';

const jovo: JovoCli = JovoCli.getInstance();

export interface GetEvents {
  'before.get': PluginContext;
  'get': PluginContext;
  'after.get': PluginContext;
}

export class Get extends PluginCommand<GetEvents & BuildEvents> {
  static id: string = 'get';
  static description: string = 'Downloads an existing platform project into the platforms folder.';
  static examples: string[] = [
    'jovo get alexaSkill --skill-id amzn1.ask.skill.xxxxxxxx',
    'jovo get googleAction --project-id testproject-xxxxxx',
  ];
  // Includes all available platforms, which will be initialized on install().
  static availablePlatforms: string[] = [];
  static flags: Input<any> = {
    locale: flags.string({
      char: 'l',
      description: 'Locale of the language model.\n<en|de|etc>',
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
    {
      name: 'platform',
      description: 'Platform to get files from.',
      options: Get.availablePlatforms,
      required: true,
    },
  ];

  static async install(
    emitter: Emitter<GetEvents>,
    config: PluginConfig,
  ): Promise<Config.Command.Plugin> {
    // Override PluginCommand.install() to fill options for --platform.
    this.availablePlatforms.push(...jovo.getPlatforms());
    return super.install(emitter, config);
  }

  install() {
    this.actionSet = {
      'before.get': [this.beforeGet.bind(this)],
    };
  }

  beforeGet() {
    // Create build/ folder depending on user config.
    const buildPath: string = jovo.$project!.getBuildPath();
    if (!existsSync(buildPath)) {
      mkdirSync(buildPath);
    }
  }

  async run() {
    checkForProjectDirectory();

    const { args, flags } = this.parse(Get);

    await this.$emitter!.run('parse', { command: Get.id, flags, args });

    console.log(`\n jovo get: ${Get.description}`);
    console.log(printSubHeadline('Learn more: https://jovo.tech/docs/cli/get\n'));

    const context: PluginContext = {
      command: Get.id,
      platforms: [args.platform],
      locales: (flags.locale || jovo.$project!.getLocales()).reduce(localeReducer, {}),
      flags,
      args,
    };

    await this.$emitter!.run('before.get', context);
    await this.$emitter!.run('get', context);
    await this.$emitter!.run('after.get', context);

    if (flags.build) {
      await this.$emitter.run('reverse.build', context);
    }
  }

  async catch(error: JovoCliError) {
    this.error(`There was a problem:\n${error}`);
  }
}
