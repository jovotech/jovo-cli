import { Input } from '@oclif/command/lib/flags';
import boxen from 'boxen';
import chalk from 'chalk';
import { accessSync } from 'fs';
import resolveBin from 'resolve-bin';
import { join as joinPaths } from 'path';
import {
  JovoCli,
  JovoCliError,
  checkForProjectDirectory,
  printCode,
  PluginContext,
  PackageVersionsNpm,
  PluginCommand,
  Task,
  flags,
} from '@jovotech/cli-core';
import { shouldUpdatePackages, instantiateJovoWebhook, compileTypeScriptProject } from '../utils';
import { ChildProcess, spawn } from 'child_process';

export type RunEvents = 'before.run' | 'run';

export class Run extends PluginCommand<RunEvents> {
  static id: string = 'run';
  static description: string = 'Runs a local development server (webhook).';
  static examples: string[] = [];
  static flags: Input<any> = {
    'port': flags.integer({
      char: 'p',
      description: 'Port to local development webhook.',
      default: 3000,
    }),
    'inspect': flags.string({
      char: 'i',
      description: 'Debugging port.',
    }),
    'stage': flags.string({
      description: 'Takes configuration from specified stage.',
    }),
    'webhook-only': flags.boolean({
      description: 'Starts the Jovo Webhook proxy without executing the code.',
    }),
    'tsc': flags.boolean({
      description: 'Compile TypeScript first before execution.',
    }),
    'disable-jovo-debugger': flags.boolean({
      description: 'Disables Jovo Debugger (web version).',
    }),
    'timeout': flags.integer({
      description: 'Sets timeout in milliseconds.',
      default: 5000,
    }),
  };
  static args = [{ name: 'webhookFile', default: 'index.js' }];

  install() {
    this.actionSet = {
      'before.run': [this.checkForOutdatedPackages.bind(this)],
    };
  }

  async checkForOutdatedPackages() {
    // Update message should be displayed in case old packages get used
    const outOfDatePackages: PackageVersionsNpm = await shouldUpdatePackages();
    if (Object.keys(outOfDatePackages).length) {
      const outputText: string[] = [];
      outputText.push('Updates available for the following Jovo packages:');
      for (const [key, pkg] of Object.entries(outOfDatePackages)) {
        const text = `  - ${key}: ${pkg.local} ${chalk.grey(`-> ${pkg.npm}`)}`;
        outputText.push(text);
      }

      outputText.push('\nUse "jovo update" to get the newest versions.');

      console.log(
        boxen(outputText.join('\n'), {
          padding: 1,
          margin: 1,
          borderColor: 'yellow',
          borderStyle: 'round',
        }),
      );
    }
  }

  async run() {
    checkForProjectDirectory();

    const { args, flags } = this.parse(Run);

    await this.$emitter!.run('parse', { command: Run.id, flags, args });

    console.log(`\n jovo run: ${Run.description}`);
    console.log(chalk.grey('   >> Learn more: https://jovo.tech/docs/cli/run\n'));

    const jovo: JovoCli = JovoCli.getInstance();

    const context: PluginContext = {
      command: Run.id,
      platforms: jovo.getPlatforms(),
      locales: flags.locale || jovo.$project!.getLocales(),
      flags,
      args,
    };
    jovo.setPluginContext(context);

    await this.$emitter!.run('before.run');

    if (flags['webhook-only']) {
      instantiateJovoWebhook({ port: flags.port, timeout: flags.timeout });
      await this.$emitter!.run('run');
    } else {
      const srcDir: string = jovo.$project!.$config.getParameter('src') as string;

      // Construct array of directories where to check for the webhook file.
      // Always check in the root directory.
      const checkFolders: string[] = ['./'];

      if (srcDir) {
        checkFolders.push(srcDir);
      }

      if (jovo.$project!.isTypeScriptProject()) {
        if (flags.tsc) {
          const task: Task = new Task('Compiling TypeScript', async () => {
            await compileTypeScriptProject(srcDir);
          });

          await task.run();
          console.log();
        }

        // If project is written in typescript, look in ./dist/ for webhook file.
        checkFolders.push('./dist/', './dist/src/');

        try {
          accessSync('./dist/');
        } catch (error) {
          const task: Task = new Task(
            'Cannot find dist/ folder. Start compiling TypeScript',
            async () => {
              await compileTypeScriptProject(srcDir);
            },
          );

          await task.run();
          console.log();
        }
      } else {
        // In regular JavaScript project, look into src/.
        checkFolders.push('./src/');
      }

      let projectFolder: string | undefined;
      for (const folderPath of checkFolders) {
        try {
          accessSync(joinPaths(folderPath, args.webhookFile));
          projectFolder = folderPath;
        } catch (error) {
          // Folder does not exist.
        }
      }

      if (!projectFolder) {
        throw new JovoCliError(
          'Could not find a project to run.',
          this.$config.pluginName!,
          `Please check for your ${printCode(
            args.webhookFile,
          )} or provide your webhook file as a command argument.`,
        );
      }

      const parameters: string[] = [
        args.webhookFile,
        '--ignore',
        'db/*',
        '--ignore',
        'test/*',
        '--webhook',
        '--jovo-webhook',
      ];

      if (flags.inspect) {
        parameters.unshift(`--inspect=${flags.inspect}`);
      }

      if (jovo.$project!.$stage) {
        parameters.push('--stage', jovo.$project!.$stage);
      }

      if (flags['disable-jovo-debugger']) {
        parameters.push('--disable-jovo-debugger');
      }

      if (flags.port) {
        parameters.push('--port', flags.port);
      }

      // Pass all parameters through to project process that gets set after "--".
      // Example: "jovo run -- --log-level 5".
      // ToDo: Not possible, since --log-level 5 will be parsed as argument.
      let addActive: boolean = false;
      for (const parameter of process.argv) {
        if (addActive) {
          parameters.push(parameter);
        } else if (parameter === '--') {
          addActive = true;
        }
      }

      const command: string = resolveBin.sync('nodemon');

      const nodeProcess: ChildProcess = spawn(command, parameters, {
        windowsVerbatimArguments: true,
        cwd: projectFolder,
      });

      instantiateJovoWebhook({ port: flags.port, timeout: flags.timeout }, nodeProcess);

      await this.$emitter!.run('run');

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
}