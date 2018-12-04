"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chalk = require("chalk");
const fs = require("fs");
const path = require("path");
const logSymbols = require("log-symbols");
const figures = require("figures");
const elegantSpinner = require("elegant-spinner");
const pointer = chalk.yellow(figures.pointer);
function isDefined(x) {
    return x !== null && x !== undefined;
}
exports.isDefined = isDefined;
function getSymbol(task, options) {
    if (!task.spinner) {
        task.spinner = elegantSpinner();
    }
    if (task.isPending()) {
        return options.showSubtasks !== false && task.subtasks.length > 0 ?
            pointer
            :
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
exports.getSymbol = getSymbol;
function deleteFolderRecursive(filepath) {
    if (fs.existsSync(filepath)) {
        fs.readdirSync(filepath).forEach((file, index) => {
            const curPath = path.join(filepath, file);
            if (fs.lstatSync(curPath).isDirectory()) {
                exports.deleteFolderRecursive(curPath);
            }
            else {
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(filepath);
    }
}
exports.deleteFolderRecursive = deleteFolderRecursive;
//# sourceMappingURL=Utils.js.map