import {
  chalk,
  CliFlags,
  flags,
  Log,
  PackageVersions,
  PluginCommand,
  PluginContext,
  ProjectCommand,
  printSubHeadline,
} from '@jovotech/cli-core';
import boxen from 'boxen';
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
  static examples: string[] = ['jovov4 run', 'jovov4 run --port 8008'];
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
    const outOfDatePackages: PackageVersions = await shouldUpdatePackages(
      this.$cli.projectPath,
      this.$cli.userConfig,
    );
    if (Object.keys(outOfDatePackages).length) {
      const outputText: string[] = [];
      outputText.push('Updates available for the following Jovo packages:');
      for (const [key, pkg] of Object.entries(outOfDatePackages)) {
        const text = `  - ${key}: ${pkg.local} ${chalk.grey(`-> ${pkg.npm}`)}`;
        outputText.push(text);
      }

      outputText.push('\nUse "jovo update" to get the newest versions.');

      Log.info(
        boxen(outputText.join('\n'), {
          padding: 1,
          margin: 1,
          borderColor: 'yellow',
          borderStyle: 'round',
        }),
      );
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

    const nodeProcess: ChildProcess = spawn('npm', ['run', `start:${flags.stage || 'dev'}`], {
      shell: true,
      windowsVerbatimArguments: true,
    });

    await this.$emitter.run('run');

    // Pipe everyhing the node process prints to output stream.
    nodeProcess.stdout!.pipe(process.stdout);
    nodeProcess.stderr!.pipe(process.stderr);

    // Ensure our child process is terminated upon exit. This is needed in the situation
    // where we're on Linux and are the child of another process (grandchild processes are orphaned in Linux).
    process.on('exit', () => {
      nodeProcess.kill();
    });
  }
}
