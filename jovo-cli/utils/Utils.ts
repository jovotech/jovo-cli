import * as chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';
import * as logSymbols from 'log-symbols';
import * as figures from 'figures';
import * as elegantSpinner from 'elegant-spinner';
import { ListrTaskHelper, ListrOptionsExtended }from '../src';
import Vorpal = require('vorpal');

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
			const curPath = path.join(filepath, file);
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
