import { flags } from '@oclif/command';
import chalk from 'chalk';
import  elegantSpinner from 'elegant-spinner';
// tslint:disable-next-line:no-implicit-dependencies
// @ts-ignore
import figures from 'figures';
import { existsSync, lstatSync, readdirSync, readFileSync, rmdirSync, unlinkSync } from 'fs';
import { getProject, InputFlags, JovoCliError } from 'jovo-cli-core';
import latestVersion from 'latest-version';
import { ListrOptions } from 'listr';
import logSymbols from 'log-symbols';
import { join as pathJoin } from 'path';
import * as deployTargets from './DeployTargets';
import { ListrTaskHelper, PackageVersions, PackageVersionsNpm } from './Interfaces';
import * as platforms from './Platforms';
import * as prompts from './Prompts';
import * as scaffolder from './Scaffolder';
import * as tasks from './Tasks';
import * as validators from './Validators';

export { platforms, prompts, tasks, validators, deployTargets, scaffolder };
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
  let packageFileName: string = '';

  // Get file name depending on what file exists.
  if (existsSync(pathJoin(projectPath, 'package-lock.json'))) {
    packageFileName = 'package-lock.json';
  } else if (existsSync(pathJoin(projectPath, 'package.json'))) {
    packageFileName = 'package.json';
  } else {
    throw new JovoCliError(
      "Could not find an NPM dependency file, such as your project's package.json.",
      'jovo-cli',
    );
  }

  const packagePath = pathJoin(projectPath, packageFileName);
  let content;
  try {
    content = readFileSync(packagePath).toString();
  } catch (e) {
    throw new JovoCliError(
      `Something went wrong while reading your ${packageFileName} file.`,
      'jovo-cli',
    );
  }

  const packageFile = JSON.parse(content);
  const packages: PackageVersions = {};
  const versionNumberRegex = /^\^?\d{1,2}\.\d{1,2}\.\d{1,2}$/;

  for (const [dependencyKey, dependency] of Object.entries(packageFile.devDependencies || {})) {
    if (packageRegex && !dependencyKey.match(packageRegex)) {
      continue;
    }

    if ((dependency as string).match(versionNumberRegex)) {
      packages[dependencyKey] = {
        dev: true,
        inPackageJson: false,
        version: (dependency as string).replace('^', ''),
      };
    }
  }

  for (const [dependencyKey, dependency] of Object.entries(packageFile.dependencies)) {
    if (packageRegex && !dependencyKey.match(packageRegex)) {
      continue;
    }

    if (typeof dependency === 'string') {
      if (dependency.match(versionNumberRegex)) {
        packages[dependencyKey] = {
          dev: false,
          inPackageJson: false,
          version: dependency.replace('^', ''),
        };
      }
    }

    // @ts-ignore
    if (typeof dependency === 'object') {
      // @ts-ignore
      if (dependency.version.match(versionNumberRegex)) {
        packages[dependencyKey] = {
          dev: !!(dependency as any).dev,
          inPackageJson: false,
          version: (dependency as any).version.replace('^', ''),
        };
      }
    }
  }

  if (existsSync(pathJoin(projectPath, 'package.json'))) {
    try {
      content = readFileSync(pathJoin(projectPath, 'package.json')).toString();
      const packageJsonFileContent = JSON.parse(content);

      Object.keys(packageJsonFileContent.dependencies || {}).forEach((key: string) => {
        if (packages[key]) {
          packages[key].inPackageJson = true;
        }
      });

      Object.keys(packageJsonFileContent.devDependencies || {}).forEach((key: string) => {
        if (packages[key]) {
          packages[key].inPackageJson = true;
        }
      });
    } catch (e) {
      throw new JovoCliError(
        `Something went wrong while reading your ${packageFileName} file.`,
        'jovo-cli',
      );
    }
  }
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
      dev: packages[packageName].dev,
      inPackageJson: packages[packageName].inPackageJson,
      local: packages[packageName].version,
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
