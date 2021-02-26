import { Project } from 'jovo-cli-core';
import { join as joinPaths } from 'path';

const project = Project.getInstance();

/**
 * Returns folder name for plugin.
 */
export function getPlatformDirectory(): string {
  return 'platform.google';
}

/**
 * Returns base path to platform's build folder.
 */
export function getPlatformPath(): string {
  return joinPaths(project.getBuildPath(), getPlatformDirectory());
}