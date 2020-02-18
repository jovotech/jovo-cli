import { Command } from '@oclif/command';
import {
	JovoCliRenderer,
	getPackageVersionsNpm,
} from '../utils';
import Listr = require('listr');
import chalk from 'chalk';
import { promisify } from 'util';
import * as rimraf from 'rimraf';
import { join as pathJoin } from 'path';
import { exec } from 'child_process';
import { getProject } from 'jovo-cli-core';
import { promptUpdateVersions, ANSWER_UPDATE } from '../utils/Prompts';
import { statSync } from 'fs-extra';

const execAsync = promisify(exec);
const rimrafAsync = promisify(rimraf);

export class Update extends Command {
	static description =
		'Updates the Jovo modules in project to latest versions.';

	async run() {
		try {
			this.parse(Update);

			const tasks = new Listr([], {
				renderer: new JovoCliRenderer(),
				collapse: false
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
						text += chalk.grey(`  -> ${pkg.npm}`);
					}
					this.log(text);
				}
			}

			if (outOfDatePackages.length === 0) {
				this.log('All packages are already up to date!');
				this.exit();
			}

			const { update } = await promptUpdateVersions(
				outOfDatePackages.length
			);
			if (update !== ANSWER_UPDATE) {
				this.exit();
			}

			let npmUpdateOutput = '';
			tasks.add({
				title: 'Updating Jovo packages...',
				task: async () => {
					const updateCommand = `npm update ${outOfDatePackages.join(
						' '
					)}`;

					try {
						const { stdout, stderr } = await execAsync(
							updateCommand,
							{
								cwd: project.getProjectPath()
							}
						);
						npmUpdateOutput = stdout;

						if (stderr) {
							throw new Error(stderr);
						}
					} catch (err) {
						this.error(err);
					}
				}
			});

			// Check bundle directory exists with node_modules. If it exists delete.
			const bundleDirectoryPath = project.getZipBundleDirectoryPath();
			try {
				// Check if bundle folder exists.
				statSync(bundleDirectoryPath);

				// Check if node_modules folder exists in it.
				const bundleNodeDirectoryPath = pathJoin(
					bundleDirectoryPath,
					'node_modules'
				);
				statSync(bundleNodeDirectoryPath);

				tasks.add({
					title: 'Deleting "node_modules" in bunle directory...',
					async task() {
						await rimrafAsync(bundleNodeDirectoryPath);
					}
				});
			} catch (err) {}

			await tasks.run();
			this.log();
			this.log('Update completed.');
			this.log();
			this.log('Update output: ');
			this.log('-------------------');
			npmUpdateOutput
				? this.log(npmUpdateOutput)
				: this.log('Everything is up to date!');

			this.log(
				'Changelog: https://raw.githubusercontent.com/jovotech/jovo-framework/master/CHANGELOG.md'
			);
		} catch (err) {
			this.error(`There was a problem:\n${err}`);
		}
	}
}
