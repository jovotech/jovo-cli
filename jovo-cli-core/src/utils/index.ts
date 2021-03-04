import { exec, ExecOptions } from 'child_process';
import { existsSync, lstatSync, readdirSync, readFileSync, rmdirSync, unlinkSync } from 'fs';
import { join as joinPaths } from 'path';
import latestVersion from 'latest-version';

import { JovoCliError, PackageVersions, PackageVersionsNpm } from '..';
import { JovoCli } from '../JovoCli';
import { printWarning } from './Prints';
import { InstallEventArguments } from './Interfaces';

export * from './Interfaces';
export * from './Validators';
export * from './Prompts';
export * from './Constants';
export * from './Prints';

/**
 * Provides own version of execSync by returning a promise on exec().
 * This offers a few advantages, such as handling stream output more precise.
 * @param cmd
 * @param options
 */
export function execAsync(cmd: string, options: ExecOptions = {}): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(cmd, options, (error, stdout, stderr) => {
      if (error) {
        return reject(error);
      }
      if (stderr && !stdout) {
        return reject(stderr);
      }

      resolve(stdout);
    });
  });
}

export function hellworld() {}

/**
 * Waits for the provided amount of time.
 * @param ms - Time to wait in ms.
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(), ms);
  });
}

/**
 * Recursively deletes all files and folders within a directory.
 * @param path
 */
export function deleteFolderRecursive(path: string) {
  if (existsSync(path)) {
    for (const file of readdirSync(path)) {
      const curPath: string = joinPaths(path, file);
      // If current path points to directory, delete recursively.
      if (lstatSync(curPath).isDirectory()) {
        deleteFolderRecursive(curPath);
      } else {
        // Delete file.
        unlinkSync(curPath);
      }
    }
    // Finally, delete empty directory.
    rmdirSync(path);
  }
}

/**
 * Returns the packages with their versions from the package-lock file
 * ToDo: Refactor!
 */
export async function getPackages(packageRegex?: RegExp): Promise<PackageVersions> {
  const jovo: JovoCli = JovoCli.getInstance();
  let packageFileName: string = '';

  // ToDo: Sufficient to just look in the package.json?
  // Get file name depending on what file exists.
  if (existsSync(joinPaths(jovo.$projectPath, 'package-lock.json'))) {
    packageFileName = 'package-lock.json';
  } else if (existsSync(joinPaths(jovo.$projectPath, 'package.json'))) {
    packageFileName = 'package.json';
  } else {
    throw new JovoCliError(
      "Could not find an NPM dependency file, such as your project's package.json.",
      'jovo-cli-core',
    );
  }

  const packagePath = joinPaths(jovo.$projectPath, packageFileName);
  let content;
  try {
    content = readFileSync(packagePath).toString();
  } catch (e) {
    throw new JovoCliError(
      `Something went wrong while reading your ${packageFileName} file.`,
      'jovo-cli-core',
    );
  }

  const packageFile = JSON.parse(content);
  const packages: PackageVersions = {};
  const versionNumberRegex: RegExp = /^\^?\d{1,2}\.\d{1,2}\.\d{1,2}$/;

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

  if (existsSync(joinPaths(jovo.$projectPath, 'package.json'))) {
    try {
      content = readFileSync(joinPaths(jovo.$projectPath, 'package.json')).toString();
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

// ToDo: Refactor!
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
 * Checks if the current working directory is a Jovo Project.
 * @param command - Command Id for the current PluginCommand.
 * @param args - Arguments for the currently executed command, including flags and args.
 */
export function checkForProjectDirectory(command: string, args: InstallEventArguments) {
  const jovo: JovoCli = JovoCli.getInstance();

  if (command === args.command && !jovo.isInProjectDirectory()) {
    console.log();
    console.log(
      printWarning('To use this command, please go into the directory of a valid Jovo project.'),
    );
    console.log();
    process.exit();
  }
}
