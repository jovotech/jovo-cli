import { Command } from '@oclif/command';
import chalk from 'chalk';
import { exec } from 'child_process';
import { statSync, writeFile } from 'fs-extra';
import { getProject, JovoCliError } from 'jovo-cli-core';
import Listr = require('listr');
import { join as pathJoin } from 'path';
import * as rimraf from 'rimraf';
import { promisify } from 'util';
import { getPackageVersionsNpm, JovoCliRenderer } from '../utils';
import { ANSWER_UPDATE, promptUpdateVersions } from '../utils/Prompts';

const execAsync = promisify(exec);

const rimrafAsync = promisify(rimraf);

export class Update extends Command {
  static description = 'Updates the Jovo modules in project to latest versions.';

  static examples = ['jovo update'];

  async run() {
    try {
      this.parse(Update);

      this.log(`\n jovo update: ${Update.description}`);
      this.log(chalk.grey('   >> Learn more: https://jovo.tech/docs/cli/update\n'));

      const tasks = new Listr([], {
        renderer: new JovoCliRenderer(),
        collapse: false,
      });

      const project = getProject();
      await project.init();

      // ToDo: Outsource to utils.
      const packageVersions = await getPackageVersionsNpm(/^jovo\-/);
      const outOfDatePackages: string[] = [];

      if (Object.keys(packageVersions).length > 0) {
        this.log('Jovo packages of current project:');
        for (const [name, pkg] of Object.entries(packageVersions)) {
          let text = `  ${name}: ${pkg.local}`;
          if (pkg.local !== pkg.npm) {
            outOfDatePackages.push(name);
            text += chalk.grey(`  -> ${pkg.npm}`);
          }
          this.log(text);
        }
      }

      if (outOfDatePackages.length === 0) {
        this.log('\n\nAll packages are already up to date!\n');
        return;
      }

      const { update } = await promptUpdateVersions(outOfDatePackages.length);
      if (update !== ANSWER_UPDATE) {
        this.exit();
      }

      let npmUpdateOutput = '';

      for (let i = 0; i < outOfDatePackages.length; i++) {
        outOfDatePackages[i] = outOfDatePackages[i] + '@latest';
      }

      tasks.add({
        title: 'Updating Jovo packages...',
        task: async () => {
          const updateCommand = `npm install ${outOfDatePackages.join(' ')} --loglevel=error`;

          try {
            const { stdout, stderr } = await execAsync(updateCommand, {
              cwd: project.getProjectPath(),
            });
            npmUpdateOutput = stdout;

            if (stderr) {
              throw new JovoCliError(stderr, 'jovo-cli');
            }
          } catch (err) {
            this.error(err);
          }
        },
      });

      // Check bundle directory exists with node_modules. If it exists delete.
      const bundleDirectoryPath = project.getZipBundleDirectoryPath();
      try {
        // Check if bundle folder exists.
        statSync(bundleDirectoryPath);

        // Check if node_modules folder exists in it.
        const bundleNodeDirectoryPath = pathJoin(bundleDirectoryPath, 'node_modules');
        statSync(bundleNodeDirectoryPath);

        tasks.add({
          title: 'Deleting "node_modules" in bundle directory...',
          async task() {
            await rimrafAsync(bundleNodeDirectoryPath);
          },
        });
      } catch (err) {}

      await tasks.run();
      this.log();
      this.log('Update completed.');
      this.log();
      this.log('Update output: ');
      this.log('-------------------');
      npmUpdateOutput ? this.log(npmUpdateOutput) : this.log('Everything is up to date!');

      this.log(
        'Changelog: https://raw.githubusercontent.com/jovotech/jovo-framework/master/CHANGELOG.md',
      );
    } catch (err) {
      this.error(`There was a problem:\n${err}`);
    }
  }
}
