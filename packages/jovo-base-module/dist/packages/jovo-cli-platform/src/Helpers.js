"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const highlight = require('chalk').white.bold;
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
//# sourceMappingURL=Helpers.js.map