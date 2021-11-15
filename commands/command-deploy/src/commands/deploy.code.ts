import {
  CliArgs,
  CliFlags,
  EventEmitter,
  flags,
  JovoCli,
  Log,
  PluginCommand,
  PluginContext,
  printSubHeadline,
  ProjectCommand,
  TADA,
} from '@jovotech/cli-core';
import _merge from 'lodash.merge';
import DeployCommand from '..';

export interface DeployCodeContext extends PluginContext {
  args: CliArgs<typeof DeployCode>;
  flags: CliFlags<typeof DeployCode>;
  target: string[];
  src?: string;
}

export type DeployCodeEvents = 'before.deploy:code' | 'deploy:code' | 'after.deploy:code';

@ProjectCommand()
export class DeployCode extends PluginCommand<DeployCodeEvents> {
  static id: string = 'deploy:code';
  static description: string = 'Upload the source code to a cloud provider';
  static examples: string[] = ['jovo deploy:code serverless'];
  // Includes all available targets, which will be initialized on install().
  static availableTargets: string[] = [];
  static flags = {
    src: flags.string({
      char: 's',
      description: 'Path to source files',
    }),
    ...PluginCommand.flags,
  };
  static args = [
    <const>{
      name: 'target',
      required: true,
      description: 'Specify the cloud provider to be deployed to',
      multiple: true,
      options: DeployCode.availableTargets,
    },
  ];
  // Allow multiple arguments by disabling argument length validation
  static strict = false;

  $context!: DeployCodeContext;

  static install(
    cli: JovoCli,
    plugin: DeployCommand,
    emitter: EventEmitter<DeployCodeEvents>,
  ): void {
    // Override PluginComponent.install() to fill options for --platform.
    this.availableTargets.push(...cli.getPluginsWithType('target').map((plugin) => plugin.id));
    super.install(cli, plugin, emitter);
  }

  async run(): Promise<void> {
    Log.spacer();
    Log.info(`jovo deploy:code: ${DeployCode.description}`);
    Log.info(printSubHeadline('Learn more: https://jovo.tech/docs/cli/deploy-code'));
    Log.spacer();

    const { args, flags } = this.parse(DeployCode);

    _merge(this.$context, {
      args,
      flags,
      target: args.target,
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
