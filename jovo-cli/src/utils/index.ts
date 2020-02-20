import { flags } from '@oclif/command';
import chalk from 'chalk';
import * as elegantSpinner from 'elegant-spinner';
// tslint:disable-next-line:no-implicit-dependencies
// @ts-ignore
import * as figures from 'figures';
import { existsSync, lstatSync, readdirSync, readFileSync, rmdirSync, unlinkSync } from 'fs';
import { getProject, InputFlags } from 'jovo-cli-core';
import latestVersion from 'latest-version';
import { ListrOptions } from 'listr';
import * as logSymbols from 'log-symbols';
import { join as pathJoin } from 'path';
import * as deployTargets from './DeployTargets';
import { ListrTaskHelper, PackageVersions, PackageVersionsNpm } from './Interfaces';
import * as platforms from './Platforms';
import * as prompts from './Prompts';
import * as tasks from './Tasks';
import * as validators from './Validators';

export { platforms, prompts, tasks, validators, deployTargets };
export * from './Interfaces';
export { JovoCliRenderer } from './JovoCliRenderer';

const project = getProject();

/**
 * From Listr utils
 */
// ToDo: Refactor!
// @ts-ignore
const pointer = chalk.yellow(figures.pointer);

export function isDefined(x: any) {
  // tslint:disable-line:no-any
  //tslint:disable-line
  return x !== null && x !== undefined;
}

export function getSymbol(task: ListrTaskHelper, options: ListrOptions) {
  if (!task.spinner) {
    task.spinner = elegantSpinner();
  }

  if (task.isPending()) {
    return options.showSubtasks !== false && task.subtasks.length > 0
      ? pointer
      : // @ts-ignore
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

/**
 * Adds CLI options for all commands
 *
 * @export
 */
export function addBaseCliOptions(options: InputFlags): void {
  options.debug = flags.boolean({
    description: 'Displays additional debugging information',
  });
}

export function deleteFolderRecursive(path: string) {
  if (existsSync(path)) {
    for (const file of readdirSync(path)) {
      const curPath = pathJoin(path, file);
      if (lstatSync(curPath).isDirectory()) {
        // recurse
        deleteFolderRecursive(curPath);
      } else {
        // delete file
        unlinkSync(curPath);
      }
    }
    rmdirSync(path);
  }
}

/**
 * Returns the packages with their versions from the package-lock file
 *
 * @export
 * @param {RegExp} [packageRegex] Regex to use to filter packages
 * @returns {PackageVersions}
 */
export async function getPackages(packageRegex?: RegExp): Promise<PackageVersions> {
  const projectPath = project.getProjectPath();
  const packagePath = pathJoin(projectPath, 'package-lock.json');
  let content;
  try {
    content = readFileSync(packagePath).toString();
  } catch (e) {
    // Could not read file
    return {};
  }
  const packageFile = JSON.parse(content);

  const packages: PackageVersions = {};
  const versionNumberRegex = /^\d{1,2}\.\d{1,2}\.\d{1,2}$/;
  Object.keys(packageFile.dependencies).forEach((packageName) => {
    const packageObj = packageFile.dependencies[packageName];

    if (packageRegex && !packageName.match(packageRegex)) {
      return;
    }

    if (!packageObj.version.match(versionNumberRegex)) {
      return;
    }

    packages[packageName] = packageFile.dependencies[packageName].version;
  });
  return packages;
}

/**
 * Returns the packages with their current versions in package-lock file and on npm
 *
 * @export
 * @param {RegExp} packageRegex Regex to use to filter packages
 * @returns {Promise<PackageVersionsNpm>}
 */
export async function getPackageVersionsNpm(packageRegex: RegExp): Promise<PackageVersionsNpm> {
  const packages = await getPackages(packageRegex);

  // Start directly with querying the data in parallel
  const queryPromises: {
    [key: string]: Promise<string>;
  } = {};
  for (const packageName of Object.keys(packages)) {
    queryPromises[packageName] = latestVersion(packageName);
  }

  // Wait till data is available and combine data
  const returnPackages: PackageVersionsNpm = {};
  for (const packageName of Object.keys(packages)) {
    returnPackages[packageName] = {
      local: packages[packageName],
      npm: await queryPromises[packageName],
    };
  }

  return returnPackages;
}

/**
 * Returns if the package update message should be displayed or not
 *
 * @export
 * @param {number} hours The minimum amount of hours since last display
 * @returns
 */
export function shouldDisplayUpdateMessage(hours: number) {
  const jovoConfig = project.loadJovoUserConfig();

  if (!jovoConfig.hasOwnProperty('timeLastUpdateMessage')) {
    return true;
  }

  const nextDisplayTime =
    new Date(jovoConfig.timeLastUpdateMessage!).getTime() + 1000 * 60 * 60 * hours;

  if (new Date().getTime() < nextDisplayTime) {
    return false;
  }
  return true;
}

/**
 * Saves the current update message display to the Jovo config
 *
 * @export
 */
export function setUpdateMessageDisplayed() {
  const jovoConfig = project.loadJovoUserConfig();
  jovoConfig.timeLastUpdateMessage = new Date().toISOString();

  project.saveJovoUserConfig(jovoConfig);
}
