import * as chalk from 'chalk';
import * as fs from 'fs';
import { join as pathJoin } from 'path';
import * as logSymbols from 'log-symbols';
import * as figures from 'figures';
import * as elegantSpinner from 'elegant-spinner';
import { ListrTaskHelper, ListrOptionsExtended, PackageVersions }from '../src';
import Vorpal = require('vorpal');

const { promisify } = require('util');

const readFileAsync = promisify(fs.readFile);

const project = require('jovo-cli-core').getProject();


/**
 * From Listr utils
 */
// @ts-ignore
const pointer = chalk.yellow(figures.pointer);


export function isDefined(x: any) { //tslint:disable-line
	return x !== null && x !== undefined;
}

export function getSymbol(task: ListrTaskHelper, options: ListrOptionsExtended){
	if (!task.spinner) {
		task.spinner = elegantSpinner();
	}

	if (task.isPending()) {
		return options.showSubtasks !== false && task.subtasks.length > 0 ?
			pointer
			:
			// @ts-ignore
			chalk.yellow(task.spinner());
	}

	if (task.isCompleted()) {
		return logSymbols.success;
	}

	if (task.hasFailed()) {
		return task.subtasks.length > 0 ? pointer : logSymbols.error;
	}

	if (task.isSkipped()) {
		return logSymbols.success;
	}

	return ' ';
}


export function deleteFolderRecursive(filepath: string) {
	if (fs.existsSync(filepath)) {
		fs.readdirSync(filepath).forEach((file, index) => {
			const curPath = pathJoin(filepath, file);
			if (fs.lstatSync(curPath).isDirectory()) { // recurse
				exports.deleteFolderRecursive(curPath);
			} else { // delete file
				fs.unlinkSync(curPath);
			}
		});
		fs.rmdirSync(filepath);
	}
}


/**
 * Adds CLI options for all commands
 *
 * @export
 * @param {Vorpal.Command} vorpalInstance
 */
export function addBaseCliOptions(vorpalInstance: Vorpal.Command): void {
	vorpalInstance
	.option('--debug',
		'Displays additional debugging informatoin');
}



/**
 * Returns the packages with their versions from the package-lock file
 *
 * @export
 * @param {RegExp} [packageRegex] Regex to use to filter packages
 * @returns {PackageVersions}
 */
export async function getPackages(packageRegex?: RegExp): PackageVersions {
	const projectPath = project.getProjectPath();
	const packagePath = pathJoin(projectPath, 'package-lock.json');
	let content;
	try {
		content = await readFileAsync(packagePath);
	} catch (e) {
		// Could not read file
		return {};
	}
	const packageFile = JSON.parse(content);

	const packages: PackageVersions = {};
	Object.keys(packageFile.dependencies).forEach((packageName) => {
		if (packageRegex && !packageName.match(packageRegex)) {
			return;
		}

		packages[packageName] = packageFile.dependencies[packageName].version;
	});

	return packages;
}