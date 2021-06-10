// This import is necessary for inferred type annotation for PluginCommand.flags.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import * as Parser from '@oclif/parser';
import boxen from 'boxen';
import { ChildProcess, spawn } from 'child_process';
import {
  checkForProjectDirectory,
  PluginContext,
  PackageVersions,
  PluginCommand,
  flags,
  CliFlags,
  printSubHeadline,
  printComment,
  Log,
} from '@jovotech/cli-core';
import { shouldUpdatePackages, instantiateJovoWebhook } from '../utils';

export type RunFlags = CliFlags<typeof Run>;

export interface RunContext extends PluginContext {
  flags: RunFlags;
}

export type RunEvents = 'before.run' | 'run';

export class Run extends PluginCommand<RunEvents> {
  static id = 'run';
  static description = 'Runs a local development server (webhook).';
  static examples: string[] = [];
  static flags = {
    'port': flags.string({
      char: 'p',
      description: 'Port to local development webhook.',
      default: '3000',
    }),
    'inspect': flags.string({
      char: 'i',
      description: 'Debugging port.',
    }),
    'webhook-only': flags.boolean({
      description: 'Starts the Jovo Webhook proxy without executing the code.',
    }),
    'disable-jovo-debugger': flags.boolean({
      description: 'Disables Jovo Debugger (web version).',
    }),
    'timeout': flags.integer({
      description: 'Sets timeout in milliseconds.',
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
      this.$cli.$projectPath,
      this.$cli.$userConfig,
    );
    if (Object.keys(outOfDatePackages).length) {
      const outputText: string[] = [];
      outputText.push('Updates available for the following Jovo packages:');
      for (const [key, pkg] of Object.entries(outOfDatePackages)) {
        const text = `  - ${key}: ${pkg.local} ${printComment(`-> ${pkg.npm}`)}`;
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
    checkForProjectDirectory(this.$cli.isInProjectDirectory());

    Log.spacer();
    Log.info(`jovo run: ${Run.description}`);
    Log.info(printSubHeadline('Learn more: https://jovo.tech/docs/cli/run\n'));

    const { flags }: { flags: RunFlags } = this.parse(Run);

    // Set plugin context
    this.$context.flags = flags;

    await this.$emitter.run('before.run');

    if (flags['webhook-only']) {
      instantiateJovoWebhook(this.$cli, { port: flags.port, timeout: flags.timeout });
      await this.$emitter.run('run');
      return;
    }

    if (flags.port) {
      process.env.JOVO_PORT = flags.port;
    }

    // TODO: How to add additional flags?
    // if (flags.inspect) {
    //   parameters.push(`--inspect=${flags.inspect}`);
    // }

    // if (this.$cli.$project!.$stage) {
    //   parameters.push('--stage', this.$cli.$project!.$stage);
    // }

    // if (flags['disable-jovo-debugger']) {
    //   parameters.push('--disable-jovo-debugger');
    // }

    const nodeProcess: ChildProcess = spawn('npm', ['run', `start:${flags.stage || 'dev'}`], {
      shell: true,
      windowsVerbatimArguments: true,
    });

    instantiateJovoWebhook(this.$cli, { port: flags.port, timeout: flags.timeout }, nodeProcess);

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
