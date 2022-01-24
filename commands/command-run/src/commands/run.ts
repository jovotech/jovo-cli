import {
  CliFlags,
  flags,
  Log,
  Package,
  PluginCommand,
  PluginContext,
  printPackages,
  printSubHeadline,
  ProjectCommand,
} from '@jovotech/cli-core';
import { ChildProcess, spawn } from 'child_process';
import { shouldUpdatePackages } from '../utilities';

export interface RunContext extends PluginContext {
  flags: CliFlags<typeof Run>;
}

export type RunEvents = 'before.run' | 'run';

@ProjectCommand()
export class Run extends PluginCommand<RunEvents> {
  static id = 'run';
  static description =
    'Start the local development server and test your app using the Jovo Debugger';
  static examples: string[] = ['jovo run', 'jovo run --port 8008'];
  static flags = {
    port: flags.string({
      char: 'p',
      description: 'The port to be used for the server',
      default: '3000',
    }),
    timeout: flags.integer({
      description: 'Maximum amount of time in milliseconds before the server returns a timeout',
      default: 5000,
    }),
    ...PluginCommand.flags,
  };
  $context!: RunContext;

  install(): void {
    this.middlewareCollection = {
      'before.run': [this.checkForOutdatedPackages.bind(this)],
    };
  }

  async checkForOutdatedPackages(): Promise<void> {
    // Update message should be displayed in case old packages get used
    const outdatedPackages: Package[] = await shouldUpdatePackages(this.$cli.userConfig);
    if (outdatedPackages.length) {
      Log.info('Updates available for the following Jovo packages:');
      Log.spacer();
      Log.info(printPackages(outdatedPackages));
      Log.spacer();
      Log.info("Use 'jovo update' to get the newest versions.");
      Log.spacer();
    }
  }

  async run(): Promise<void> {
    Log.spacer();
    Log.info(`jovo run: ${Run.description}`);
    Log.info(printSubHeadline('Learn more: https://jovo.tech/docs/cli/run\n'));

    const { flags } = this.parse(Run);

    // Set plugin context
    this.$context.flags = flags;

    await this.$emitter.run('before.run');

    if (flags.port) {
      process.env.JOVO_PORT = flags.port;
    }

    process.env.JOVO_CLI_PROCESS_ID = `${process.pid}`;

    const nodeProcess: ChildProcess = spawn('npm', ['run', `start:${flags.stage || 'dev'}`], {
      shell: true,
      windowsVerbatimArguments: true,
      stdio: [process.stdin, process.stdout, process.stderr],
    });

    await this.$emitter.run('run');

    // Ensure our child process is terminated upon exit. This is needed in the situation
    // where we're on Linux and are the child of another process (grandchild processes are orphaned in Linux).
    process.on('SIGTERM', () => {
      if (nodeProcess.pid) {
        process.kill(nodeProcess.pid, 'SIGTERM');
      }
      process.exit();
    });
  }
}
