'use strict';
const logUpdate = require('log-update');
const chalk = require('chalk');
const indentString = require('indent-string');
const cliTruncate = require('cli-truncate');
const utils = require('./utils');

/**
 * Custom Listr renderer helper
 * @param {Array<Task>} tasks
 * @param {*} options
 * @param {Number} level
 * @return {string} output
 */
const renderHelper = (tasks, options, level) => {
    level = level || 1;

    let output = [];

    for (const task of tasks) {
        if (task.isEnabled()) {
            output.push(indentString(` ${utils.getSymbol(task, options)} ${task.title}`, '  ', level));

            if ((task.isPending() || task.isSkipped() || task.hasFailed()) &&
                utils.isDefined(task.output)) {
                let data = task.output;

                if (utils.isDefined(data)) {
                    if (data.substr(0, 5) === 'Info:') {
                        let arr = data.substr(6).split('\n');
                        for (let item of arr) {
                            output.push(indentString(`   ${chalk.grey(cliTruncate(item, process.stdout.columns - 3))}`, '  ', level));
                        }
                    } else if (data.substr(0, 6) === 'Error:') {
                        let arr = data.substr(7).split('\n');
                        for (let item of arr) {
                            output.push(indentString(`   ${chalk.red(cliTruncate(item, process.stdout.columns - 3))}`, '  ', level));
                        }
                    } else {
                        const out =`-> ${data}`;
                        output.push(indentString(`   ${chalk.gray(cliTruncate(out, process.stdout.columns - 3))}`, '  ', level));
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

const render = (tasks, options) => {
    logUpdate(renderHelper(tasks, options));
};


/**
 * Custom Render Class
 */
class JovoCliRenderer {
    /**
     * Constructor
     * @param {Array<Task>} tasks
     * @param {*} options
     */
    constructor(tasks, options) {
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
    render() {
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
    end(err) {
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


module.exports = JovoCliRenderer;
