import {
  checkForProjectDirectory,
  CliArgs,
  CliFlags,
  EventEmitter,
  flags,
  JovoCli,
  Log,
  PluginCommand,
  PluginContext,
  printSubHeadline,
  TADA,
} from '@jovotech/cli-core';
import _merge from 'lodash.merge';
import DeployCommand from '..';

export type DeployCodeFlags = CliFlags<typeof DeployCode>;
export type DeployCodeArgs = CliArgs<typeof DeployCode>;

export interface DeployCodeContext extends PluginContext {
  args: DeployCodeArgs;
  flags: DeployCodeFlags;
  target: string[];
  locales: string[];
  src?: string;
}

export type DeployCodeEvents = 'before.deploy:code' | 'deploy:code' | 'after.deploy:code';

export class DeployCode extends PluginCommand<DeployCodeEvents> {
  static id: string = 'deploy:code';
  static description: string = 'Deploys project code.';
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
    src: flags.string({
      char: 's',
      description: 'Path to source files.',
    }),
    ...PluginCommand.flags,
  };
  static args = [
    <const>{
      name: 'target',
      description: 'Deploys.',
      options: DeployCode.availableTargets,
    },
  ];
  $context!: DeployCodeContext;

  static install(
    cli: JovoCli,
    plugin: DeployCommand,
    emitter: EventEmitter<DeployCodeEvents>,
  ): void {
    // Override PluginComponent.install() to fill options for --platform.
    this.availableTargets.push(...cli.getPluginsWithType('target').map((plugin) => plugin.$id));
    super.install(cli, plugin, emitter);
  }

  async run(): Promise<void> {
    checkForProjectDirectory(this.$cli.isInProjectDirectory());

    Log.spacer();
    Log.info(`jovo deploy:code: ${DeployCode.description}`);
    Log.info(printSubHeadline('Learn more: https://jovo.tech/docs/cli/deploy-code\n'));

    const { args, flags }: { args: DeployCodeArgs; flags: DeployCodeFlags } =
      this.parse(DeployCode);

    _merge(this.$context, {
      args,
      flags,
      locales: flags.locale || this.$cli.$project!.getLocales(),
      target: args.target ? [args.target] : DeployCode.availableTargets,
      src: flags.src,
    });

    await this.$emitter.run('before.deploy:code');
    await this.$emitter.run('deploy:code');
    await this.$emitter.run('after.deploy:code');

    Log.spacer();
    Log.info(`${TADA} Code deployment completed.`);
    Log.spacer();
  }
}
