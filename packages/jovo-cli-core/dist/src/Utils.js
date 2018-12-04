"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path_1 = require("path");
const highlight = require('chalk').white.bold;
function log(msg) {
    let data = '';
    try {
        data = fs.readFileSync('debug.log', 'utf8');
    }
    catch (e) {
    }
    if (typeof msg !== 'string') {
        msg = JSON.stringify(msg, null, '\t');
    }
    data += '\n' + msg;
    fs.writeFileSync('debug.log', data);
}
exports.log = log;
function getUserHome() {
    let envVariable = 'HOME';
    if (process.platform === 'win32') {
        envVariable = 'USERPROFILE';
    }
    if (process.env[envVariable] === undefined) {
        return path_1.sep;
    }
    return process.env[envVariable];
}
exports.getUserHome = getUserHome;
function wait(ms) {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve();
        }, ms);
    });
}
exports.wait = wait;
function printStage(stage) {
    return stage ? `(stage: ${highlight(stage)})` : ``;
}
exports.printStage = printStage;
//# sourceMappingURL=Utils.js.map