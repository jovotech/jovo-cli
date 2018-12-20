import * as logUpdate from 'log-update';
import * as chalk from 'chalk';
import indentString = require('indent-string');
import cliTruncate = require('cli-truncate');
import * as Listr from 'listr';
import { getSymbol, isDefined } from './Utils';
import { ListrTaskHelper, ListrOptionsExtended } from '../src';

/**
 * Custom Listr renderer helper
 * @param {Array<Task>} tasks
 * @param {*} options
 * @param {Number} level
 * @return {string} output
 */
const renderHelper = (tasks: ListrTaskHelper[], options: ListrOptionsExtended, level?: number): string => {
	level = level || 1;

	let output: string[] = [];

	for (const task of tasks) {
		if (task.isEnabled()) {
			output.push(indentString(` ${getSymbol(task, options)} ${task.title}`, level,  '  '));

			if ((task.isPending() || task.isSkipped() || task.hasFailed()) &&
				isDefined(task.output)) {
				const data = task.output;

				if (isDefined(data)) {
					if (data.substr(0, 5) === 'Info:') {
						const arr = data.substr(6).split('\n');
						for (const item of arr) {
							// @ts-ignore
							output.push(indentString(`   ${chalk.grey(cliTruncate(item, process.stdout.columns - 3))}`, level, '  '));
						}
					} else if (data.substr(0, 6) === 'Error:') {
						const arr = data.substr(7).split('\n');
						for (const item of arr) {
							// @ts-ignore
							output.push(indentString(`   ${chalk.red(cliTruncate(item, process.stdout.columns - 3))}`, level, '  '));
						}
					} else {
						const out = `-> ${data}`;
						// @ts-ignore
						output.push(indentString(`   ${chalk.gray(cliTruncate(out, process.stdout.columns - 3))}`, level, '  '));
					}
				}
			}

			if ((task.isPending() || task.hasFailed() || options.collapse === false) &&
				(task.hasFailed() || options.showSubtasks !== false) &&
				task.subtasks.length > 0) {
				output = output.concat(renderHelper(task.subtasks, options, level + 1));
			}
		}
	}
	return output.join('\n');
};

const render = (tasks: ListrTaskHelper[], options: ListrOptionsExtended) => {
	logUpdate(renderHelper(tasks, options));
};


/**
 * Custom Render Class
 */
export class JovoCliRenderer implements Listr.ListrRenderer {

	_id: NodeJS.Timer | undefined;
	_options: ListrOptionsExtended;
	_tasks: ListrTaskHelper[];
	nonTTY: boolean;

    /**
     * Constructor
     * @param {Array<Task>} tasks
     * @param {*} options
     */
	constructor(tasks = [], options = {}) {
		this.nonTTY =  false;
		this._tasks = tasks;
		this._options = Object.assign({
			showSubtasks: true,
			collapse: true,
			clearOutput: false,
		}, options);
	}

    /**
     * Render
     */
	render(): void {
		if (this._id) {
			// Do not render if we are already rendering
			return;
		}

		this._id = setInterval(() => {
			render(this._tasks, this._options);
		}, 100);
	}

    /**
     * End
     * @param {Error} err
     */
	end(err?: Error): void {
		if (this._id) {
			clearInterval(this._id);
			this._id = undefined;
		}

		render(this._tasks, this._options);

		if (this._options.clearOutput && err === undefined) {
			logUpdate.clear();
		} else {
			logUpdate.done();
		}
	}
}
