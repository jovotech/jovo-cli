'use strict';
const chalk = require('chalk');
const logSymbols = require('log-symbols');
const figures = require('figures');
const elegantSpinner = require('elegant-spinner');
const pathSep = require('path');
const fs = require('fs');
/**
 * From Listr utils
 */
const pointer = chalk.yellow(figures.pointer);

exports.isDefined = (x) => x !== null && x !== undefined;

exports.getSymbol = (task, options) => {
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
};


exports.deleteFolderRecursive = (path) => {
    if ( fs.existsSync(path) ) {
        fs.readdirSync(path).forEach(function(file, index) {
            let curPath = path + pathSep + file;
            if (fs.lstatSync(curPath).isDirectory()) { // recurse
                deleteFolderRecursive(curPath);
            } else { // delete file
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(path);
    }
};

exports.log = (msg) => {
    let data = '';
    try {
        data = fs.readFileSync('debug.log', 'utf8');
    } catch (e) {
    }

    if (typeof msg !== 'string') {
        msg = JSON.stringify(msg, null, '\t');
    }


    data += '\n' + msg;
    fs.writeFileSync('debug.log', data);
};
