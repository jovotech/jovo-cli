const { join } = require('path');
const globalModules = require('global-modules');
const symlinkDir = require('symlink-dir');

(async () => {
    await symlinkDir('.', join(globalModules, 'jovo-cli-command-build'));
})();