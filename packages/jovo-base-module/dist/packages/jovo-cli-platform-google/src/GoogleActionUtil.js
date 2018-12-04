'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = require("path");
const project = require('jovo-cli-core').getProject();
function getPath() {
    return path_1.join(project.getProjectPath() + 'platforms', 'googleAction');
}
exports.getPath = getPath;
//# sourceMappingURL=GoogleActionUtil.js.map