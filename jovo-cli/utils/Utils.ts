import * as chalk from 'chalk';
import * as fs from 'fs';
import { join as pathJoin } from 'path';
import * as logSymbols from 'log-symbols';
import * as figures from 'figures';
import * as elegantSpinner from 'elegant-spinner';
import { ListrTaskHelper, ListrOptionsExtended, PackageVersions, PackageVersionsNpm }from '../src';
import Vorpal = require('vorpal');
import * as latestVersion from 'latest-version';

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
		'Displays additional debugging information');
}



/**
 * Returns the packages with their versions from the package-lock file
 *
 * @export
 * @param {RegExp} [packageRegex] Regex to use to filter packages
 * @returns {PackageVersions}
 */
export async function getPackages(packageRegex?: RegExp): Promise<PackageVersions> {
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



/**
 * Returns the packages with their current versions in package-lock file and on npm
 *
 * @export
 * @param {RegExp} packageRegex Regex to use to filter packages
 * @returns {Promise<PackageVersionsNpm>}
 */
export async function getPackageVersionsNpm(packageRegex: RegExp): Promise<PackageVersionsNpm> {
	const packages = await getPackages(packageRegex);

	// Start directly with querying the data in parallel
	const queryPromises: {
		[key: string]: Promise<string>;
	} = {};
	for (const packageName of Object.keys(packages)) {
		queryPromises[packageName] = latestVersion(packageName);
	}

	// Wait till data is available and combine data
	const returnPackages: PackageVersionsNpm = {};
	for (const packageName of Object.keys(packages)) {
		returnPackages[packageName] = {
			local: packages[packageName],
			npm: await queryPromises[packageName],
		};
	}

	return returnPackages;
}



/**
 * Returns if the package update message should be displayed or not
 *
 * @export
 * @param {number} hours The minimum amount of hours since last display
 * @returns
 */
export function shouldDisplayUpdateMessage(hours: number) {
	const jovoConfig = project.loadJovoConfig();

	if (!jovoConfig.hasOwnProperty('timeLastUpdateMessage')) {
		return true;
	}

	const nextDisplayTime = new Date(jovoConfig.timeLastUpdateMessage).getTime() + (1000*60*60*hours);

	if (new Date().getTime() < nextDisplayTime) {
		return false;
	}
	return true;
}



/**
 * Saves the current update message display to the Jovo config
 *
 * @export
 */
export function setUpdateMessageDisplayed() {
	const jovoConfig = project.loadJovoConfig();
	jovoConfig.timeLastUpdateMessage = new Date().toISOString();

	project.saveJovoConfig(jovoConfig);
}