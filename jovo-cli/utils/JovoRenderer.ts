import * as logUpdate from 'log-update';
import * as chalk from 'chalk';
import indentString = require('indent-string');
import cliTruncate = require('cli-truncate');
import * as Listr from 'listr';
import { getSymbol, isDefined } from './Utils';
import { ListrTaskHelper, ListrOptionsExtended } from '../src';


// Idents multi-line text correctly and colors it
const intdentText = (text: string, level: number, indentText = '    ', color: string, firstLinePrefix: string): string[] => {
	if (typeof text !== 'string') {
		// If it is still not a string we display custom text
		text = 'Message can not be displayed!';
	}

	const indentLength = level * indentString.length;
	const maxLength = 80;
	const maxTextLength = maxLength - indentLength;

	let textLeft = text;
	let tempText = '';
	const returnArray = [];
	let lastSpacePosition: number;
	let fullIdentText: string;
	let itteration = 0;
	do {
		tempText = textLeft.substring(0, maxTextLength);
		textLeft = textLeft.substring(maxTextLength);

		if (textLeft && tempText.charAt(maxTextLength - 1) !== ' ' && textLeft.charAt(0) !== ' ') {
			// If the line does not end with a space or the next one does not start with one
			// we did split within a word. So fix that by adding the part of the last word
			// in which we did split to the next line.
			lastSpacePosition = tempText.lastIndexOf(' ');

			if (lastSpacePosition !== -1) {
				textLeft = (tempText.substring(lastSpacePosition) + textLeft).trim();
				tempText = tempText.substring(0, lastSpacePosition).trim();
			}

		} else {
			tempText = tempText.trim();
			textLeft = textLeft.trim();
		}

		fullIdentText = indentText.repeat(level + 1);

		if (firstLinePrefix) {
			if (itteration === 0) {
				fullIdentText = fullIdentText + firstLinePrefix;
			} else {
				fullIdentText = fullIdentText + ' '.repeat(firstLinePrefix.length);
			}
		}
		// @ts-ignore
		returnArray.push(`${chalk[color](fullIdentText + tempText)}`);
		itteration++;
	} while (textLeft);

	return returnArray;
};


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
			if (options.separateTopTasks === true && level === 1) {
				output.push('');
			}
			output.push(indentString(` ${getSymbol(task, options)} ${task.title}`, level,  '  '));

			if ((task.isPending() || task.isSkipped() || task.hasFailed()) &&
				isDefined(task.output)) {
				const data = task.output;

				if (isDefined(data)) {
					if (data.substr(0, 5) === 'Info:') {
						const arr = data.substr(6).split('\n');
						for (const item of arr) {
							// @ts-ignore
							output.push.apply(output, intdentText(item, level, '  ', 'grey', ' -> '));
						}
					} else if (data.substr(0, 6) === 'Error:') {
						const arr = data.substr(7).split('\n');
						for (const item of arr) {
							output.push.apply(output, intdentText(item, level, '  ', 'red', ' '));
						}
					} else {
						output.push.apply(output, intdentText(data, level, '  ', 'grey', ' -> '));
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
			separateTopTasks: false,
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
