import {
  checkForProjectDirectory,
  CliArgs,
  CliFlags,
  Emitter,
  flags,
  JovoCli,
  ParseContext,
  PluginCommand,
  PluginConfig,
  PluginContext,
  printSubHeadline,
  TADA,
} from '@jovotech/cli-core';

import DeployCommand from '..';

const jovo: JovoCli = JovoCli.getInstance();

export type DeployCodeFlags = CliFlags<typeof DeployCode>;
export type DeployCodeArgs = CliArgs<typeof DeployCode>;

export interface DeployCodeContext extends PluginContext {
  args: DeployCodeArgs;
  flags: DeployCodeFlags;
  target: string;
}

export interface ParseContextDeployCode extends ParseContext {
  args: DeployCodeArgs;
  flags: DeployCodeFlags;
}

export type DeployCodeEvents = 'before.deploy:code' | 'deploy:code' | 'after.deploy:code';

export class DeployCode extends PluginCommand<DeployCodeEvents> {
  static id = 'deploy:code';
  static description = 'Deploys project code.';
  static examples: string[] = [
    'jovo deploy --locale en-US --platform alexaSkill --stage dev',
    'jovo deploy --target zip',
  ];
  // Includes all available targets, which will be initialized on install().
  static availableTargets: string[] = [];
  static flags = {
    locale: flags.string({
      char: 'l',
      description: 'Locale of the language model.\n<en|de|etc>',
      multiple: true,
    }),
    platform: flags.string({
      char: 'p',
      description: 'Specifies a build platform.',
      options: (() => {
        return jovo.getPlatforms();
      })(),
    }),
    stage: flags.string({
      description: 'Takes configuration from specified stage.',
    }),
    src: flags.string({
      char: 's',
      description: `Path to source files.\n Default: ${jovo.$projectPath}`,
    }),
  };

  static args = [
    <const>{
      name: 'target',
      description: 'Deploys.',
      options: DeployCode.availableTargets,
    },
  ];

  static install(
    plugin: DeployCommand,
    emitter: Emitter<DeployCodeEvents>,
    config: PluginConfig,
  ): void {
    // Override PluginComponent.install() to fill options for --platform.
    this.availableTargets.push(...jovo.getPluginsWithType('target').map((plugin) => plugin.$id));
    super.install(plugin, emitter, config);
  }

  async run(): Promise<void> {
    checkForProjectDirectory();

    const { args, flags }: Pick<ParseContextDeployCode, 'args' | 'flags'> = this.parse(DeployCode);

    await this.$emitter.run('parse', { command: DeployCode.id, flags, args });

    console.log();
    console.log(`jovo deploy:code: ${DeployCode.description}`);
    console.log(printSubHeadline('Learn more: https://jovo.tech/docs/cli/deploy-code\n'));

    const context: DeployCodeContext = {
      command: DeployCode.id,
      platforms: jovo.getPlatforms(),
      locales: flags.locale || jovo.$project!.getLocales(),
      // ToDo: Configure deploy depending on target.
      target: args.target,
      // src: flags.src || jovo.$project!.getBuildDirectory(),
      flags,
      args,
    };
    jovo.setPluginContext(context);

    await this.$emitter.run('before.deploy:code');
    await this.$emitter.run('deploy:code');
    await this.$emitter.run('after.deploy:code');

    console.log();
    console.log(`${TADA} Code deployment completed. ${TADA}`);
    console.log();
  }
}
