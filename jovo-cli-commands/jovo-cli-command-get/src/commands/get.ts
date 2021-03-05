import { flags } from '@oclif/command';
import { Input } from '@oclif/command/lib/flags';
import { existsSync, mkdirSync } from 'fs';
import {
  JovoCli,
  checkForProjectDirectory,
  JovoCliError,
  JovoCliPluginContext,
  PluginCommand,
  printSubHeadline,
} from 'jovo-cli-core';

const jovo: JovoCli = JovoCli.getInstance();

export interface GetEvents {
  'before.get': JovoCliPluginContext;
  'get': JovoCliPluginContext;
  'after.get': JovoCliPluginContext;
}

export class Get extends PluginCommand<GetEvents> {
  static id: string = 'get';
  static description: string = 'Downloads an existing platform project into the platforms folder.';
  static examples: string[] = [
    'jovo get alexaSkill --skill-id amzn1.ask.skill.xxxxxxxx',
    'jovo get googleAction --project-id testproject-xxxxxx',
  ];
  // Includes all available platforms, which will be initialized on install().
  static AVAILABLE_PLATFORMS: string[] = [];
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
  static args = [{ name: 'platform', options: jovo.getPlatforms(), required: true }];

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

    this.log(`\n jovo get: ${Get.description}`);
    this.log(printSubHeadline('Learn more: https://jovo.tech/docs/cli/get\n'));

    const context: JovoCliPluginContext = {
      command: Get.id,
      platforms: [args.platform],
      locales: flags.locale ? [flags.locale] : jovo.$project!.getLocales(),
      flags,
      args,
    };

    await this.$emitter!.run('before.get', context);
    await this.$emitter!.run('get', context);
    await this.$emitter!.run('after.get', context);
  }

  async catch(error: JovoCliError) {
    this.error(`There was a problem:\n${error}`);
  }
}
