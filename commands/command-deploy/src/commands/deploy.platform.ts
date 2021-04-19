import * as Config from '@oclif/config';
// This import is necessary for inferred type annotation for PluginCommand.flags.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import * as Parser from '@oclif/parser';
import { existsSync } from 'fs';
import {
  checkForProjectDirectory,
  Emitter,
  flags,
  JovoCli,
  JovoCliError,
  PluginConfig,
  PluginContext,
  PluginCommand,
  printSubHeadline,
  TARGET_ALL,
  TARGET_INFO,
  TARGET_MODEL,
  CliFlags,
  createTypedArguments,
  CliArgs,
  ParseContext,
  TADA,
} from '@jovotech/cli-core';
import DeployCommand from '..';

const jovo: JovoCli = JovoCli.getInstance();

export type DeployPlatformFlags = CliFlags<typeof DeployPlatform>;
export type DeployPlatformArgs = CliArgs<typeof DeployPlatform>;

export interface DeployPlatformContext extends PluginContext {
  args: DeployPlatformArgs;
  flags: DeployPlatformFlags;
  target: typeof TARGET_ALL | typeof TARGET_INFO | typeof TARGET_MODEL;
  src: string;
}

export interface ParseContextDeployPlatform extends ParseContext {
  args: DeployPlatformArgs;
  flags: DeployPlatformFlags;
}

export type DeployPlatformEvents =
  | 'before.deploy:platform'
  | 'deploy:platform'
  | 'after.deploy:platform';

export class DeployPlatform extends PluginCommand<DeployPlatformEvents> {
  static id = 'deploy:platform';
  static description = 'Deploys platform configuration.';
  static examples: string[] = [
    'jovo deploy --locale en-US --platform alexaSkill --stage dev',
    'jovo deploy --target zip',
  ];
  static availablePlatforms: string[] = [];
  static flags = {
    locale: flags.string({
      char: 'l',
      description: 'Locale of the language model.\n<en|de|etc>',
      multiple: true,
    }),
    stage: flags.string({
      description: 'Takes configuration from specified stage.',
    }),
    target: flags.string({
      char: 't',
      description: 'Deploy target.',
      options: [TARGET_ALL, TARGET_INFO, TARGET_MODEL],
      default: TARGET_ALL,
    }),
    src: flags.string({
      char: 's',
      description: 'Location of model files.',
    }),
  };
  static args = createTypedArguments([
    {
      name: 'platform',
      required: true,
      description: 'Specifies a build platform.',
      options: DeployPlatform.availablePlatforms,
    },
  ]);

  static async install(
    plugin: DeployCommand,
    emitter: Emitter<DeployPlatformEvents>,
    config: PluginConfig,
  ): Promise<Config.Command.Plugin> {
    // Override PluginCommand.install() to fill options for --platform.
    this.availablePlatforms.push(...jovo.getPlatforms());
    return super.install(plugin, emitter, config);
  }

  install(): void {
    this.actionSet = {
      'before.deploy:platform': [this.checkForPlatformsFolder.bind(this)],
    };
  }

  checkForPlatformsFolder(): void {
    if (!existsSync(jovo.$project!.getBuildPath())) {
      throw new JovoCliError(
        "Couldn't find a platform folder.",
        this.$plugin.constructor.name,
        'Please use "jovo build" to create platform-specific files.',
      );
    }
  }

  async run(): Promise<void> {
    checkForProjectDirectory();

    const { args, flags }: Pick<ParseContextDeployPlatform, 'args' | 'flags'> = this.parse(
      DeployPlatform,
    );

    await this.$emitter.run('parse', { command: DeployPlatform.id, flags, args });

    console.log();
    console.log(`jovo deploy:platform: ${DeployPlatform.description}`);
    console.log(printSubHeadline('Learn more: https://jovo.tech/docs/cli/deploy-platform\n'));

    const context: DeployPlatformContext = {
      command: DeployPlatform.id,
      platforms: args.platform ? [args.platform] : jovo.getPlatforms(),
      locales: flags.locale || jovo.$project!.getLocales(),
      // ToDo: Configure deploy depending on target.
      target: flags.target as typeof TARGET_ALL | typeof TARGET_INFO | typeof TARGET_MODEL,
      src: flags.src || jovo.$project!.getBuildDirectory(),
      flags,
      args,
    };
    jovo.setPluginContext(context);

    await this.$emitter.run('before.deploy:platform');
    await this.$emitter.run('deploy:platform');
    await this.$emitter.run('after.deploy:platform');

    console.log();
    console.log(`${TADA} Platform deployment completed. ${TADA}`);
    console.log();
  }
}
