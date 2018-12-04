"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const logUpdate = require("log-update");
const chalk = require("chalk");
const indentString = require("indent-string");
const cliTruncate = require("cli-truncate");
const Utils_1 = require("./Utils");
const renderHelper = (tasks, options, level) => {
    level = level || 1;
    let output = [];
    for (const task of tasks) {
        if (task.isEnabled()) {
            output.push(indentString(` ${Utils_1.getSymbol(task, options)} ${task.title}`, level, '  '));
            if ((task.isPending() || task.isSkipped() || task.hasFailed()) &&
                Utils_1.isDefined(task.output)) {
                const data = task.output;
                if (Utils_1.isDefined(data)) {
                    if (data.substr(0, 5) === 'Info:') {
                        const arr = data.substr(6).split('\n');
                        for (const item of arr) {
                            output.push(indentString(`   ${chalk.grey(cliTruncate(item, process.stdout.columns - 3))}`, level, '  '));
                        }
                    }
                    else if (data.substr(0, 6) === 'Error:') {
                        const arr = data.substr(7).split('\n');
                        for (const item of arr) {
                            output.push(indentString(`   ${chalk.red(cliTruncate(item, process.stdout.columns - 3))}`, level, '  '));
                        }
                    }
                    else {
                        const out = `-> ${data}`;
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
const render = (tasks, options) => {
    logUpdate(renderHelper(tasks, options));
};
class JovoCliRenderer {
    constructor(tasks = [], options = {}) {
        this.nonTTY = false;
        this._tasks = tasks;
        this._options = Object.assign({
            showSubtasks: true,
            collapse: true,
            clearOutput: false,
        }, options);
    }
    render() {
        if (this._id) {
            return;
        }
        this._id = setInterval(() => {
            render(this._tasks, this._options);
        }, 100);
    }
    end(err) {
        if (this._id) {
            clearInterval(this._id);
            this._id = undefined;
        }
        render(this._tasks, this._options);
        if (this._options.clearOutput && err === undefined) {
            logUpdate.clear();
        }
        else {
            logUpdate.done();
        }
    }
}
exports.JovoCliRenderer = JovoCliRenderer;
//# sourceMappingURL=JovoRenderer.js.map