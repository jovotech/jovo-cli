'use strict';

import { join as pathJoin } from 'path';
const project = require('jovo-cli-core').getProject();

/**
 * Returns base path to Google Action
 * @return {string}
 */
export function getPath() {
  return pathJoin(project.getProjectPath() + 'platforms', 'googleAction');
}
