import {
  CliFlags,
  flags,
  getOutdatedPackages,
  Log,
  Package,
  PluginCommand,
  PluginContext,
  printPackages,
  printSubHeadline,
  ProjectCommand,
} from '@jovotech/cli-core';
import open from 'open';
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
    const outdatedPackages: Package[] = await getOutdatedPackages(/@jovotech\//);

    if (shouldUpdatePackages(this.$cli.userConfig, outdatedPackages)) {
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

    const nodeProcess: ChildProcess = spawn('npm', ['run', `start:${flags.stage || 'dev'}`], {
      shell: true,
      windowsVerbatimArguments: true,
      stdio: [process.stdin, process.stdout, process.stderr],
    });

    // Check if we can enable raw mode for input stream to capture raw keystrokes
    if (process.stdin.isTTY && process.stdin.setRawMode) {
      setTimeout(() => {
        // eslint-disable-next-line no-console
        console.log(`\nTo open Jovo Debugger in your browser, press the "." key.\n`);
      }, 500);

      // Capture unprocessed key input.
      process.stdin.setRawMode(true);
      // Explicitly resume emitting data from the stream.
      process.stdin.resume();
      // Capture readable input as opposed to binary.
      process.stdin.setEncoding('utf-8');

      // Collect input text from input stream.
      process.stdin.on('data', async (keyRaw: Buffer) => {
        const key: string = keyRaw.toString();
        // When dot gets pressed, try to open the debugger in browser.
        if (key === '.') {
          try {
            await open(this.$cli.getJovoWebhookUrl());
          } catch (error) {
            Log.info(
              `Could not open browser. Please open debugger manually by visiting this url: ${this.$cli.getJovoWebhookUrl()}`,
            );
          }
        } else {
          if (key.charCodeAt(0) === 3) {
            // Ctrl+C has been pressed, kill process.

            if (process.platform === 'win32') {
              process.stdin.pause();
              process.stdin.setRawMode?.(false);
              console.log('Press Ctrl + C again to exit...');
            } else {
              nodeProcess.kill();
              process.exit();
            }
          } else {
            // Record input text and write it into terminal.
            process.stdout.write(key);
          }
        }
      });
    }

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
