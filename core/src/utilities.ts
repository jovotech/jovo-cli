import { exec, ExecException, ExecOptions } from 'child_process';
import { existsSync, lstatSync, readdirSync, readFileSync, rmdirSync, unlinkSync } from 'fs';
import latestVersion from 'latest-version';
import _get from 'lodash.get';
import { join as joinPaths } from 'path';
import stripAnsi from 'strip-ansi';
import {
  DependencyFile,
  ExecResponse,
  LocaleMap,
  Packages,
  PackageVersions,
  SupportedLanguages,
} from './interfaces';
import { JovoCliError } from './JovoCliError';
import { Log } from './Logger';

/**
 * Provides own version of execSync by returning a promise on exec().
 * This offers a few advantages, such as handling stream output more precise.
 * @param cmd - Command to execute
 * @param options - Options to pass to exec()
 */
export function execAsync(cmd: string, options: ExecOptions = {}): Promise<ExecResponse> {
  return new Promise((resolve, reject) => {
    exec(cmd, options, (error: ExecException | null, stdout: string, stderr: string) => {
      if (error) {
        reject({ stderr: error.message, stdout });
      } else {
        // Reject only if stdout is empty.
        if (stderr && !stdout) {
          reject({ stderr });
        }

        // Pass stderr to result for the case that some warning was passed into the error stream.
        resolve({ stderr, stdout });
      }
    });
  });
}

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
 * @param path - Path to directory to delete.
 */
export function deleteFolderRecursive(path: string): void {
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
 * Returns packages with their respective versions from the project dependency file, either
 * package-lock.json or package.json.
 * @param packageRegex - RegExp to filter for packages.
 */
export async function getPackages(packageRegex: RegExp, projectPath: string): Promise<Packages> {
  let packageFileName: string = '';

  // Get file name depending on what file exists, preferrably package-lock.json.
  if (existsSync(joinPaths(projectPath, 'package-lock.json'))) {
    packageFileName = 'package-lock.json';
  } else if (existsSync(joinPaths(projectPath, 'package.json'))) {
    packageFileName = 'package.json';
  } else {
    throw new JovoCliError({
      message: "Could not find an NPM dependency file, such as your project's package.json.",
    });
  }

  const packagePath: string = joinPaths(projectPath, packageFileName);
  let content: string;
  try {
    content = readFileSync(packagePath, 'utf-8');
  } catch (error) {
    throw new JovoCliError({
      message: `Something went wrong while reading your ${packageFileName} file.`,
    });
  }

  const packageFile: DependencyFile = JSON.parse(content);
  const packages: Packages = {};
  const versionNumberRegex: RegExp = /^\^?\d{1,2}\.\d{1,2}\.\d{1,2}(-alpha.\d{1,2})?$/;

  // Look through devDependencies of package.json.
  for (const [dependencyKey, dependency] of Object.entries(packageFile.devDependencies || {})) {
    if (!dependencyKey.match(packageRegex)) {
      continue;
    }

    if (dependency.match(versionNumberRegex)) {
      packages[dependencyKey] = {
        dev: true,
        inPackageJson: true,
        version: (dependency as string).replace('^', ''),
      };
    }
  }

  // Look through dependencies of package.json/package-lock.json.
  for (const [dependencyKey, dependency] of Object.entries(packageFile.dependencies || {})) {
    if (!dependencyKey.match(packageRegex)) {
      continue;
    }

    if (typeof dependency === 'string') {
      if (dependency.match(versionNumberRegex)) {
        packages[dependencyKey] = {
          dev: false,
          inPackageJson: true,
          version: dependency.replace('^', ''),
        };
      }
    } else {
      if (dependency.version.match(versionNumberRegex)) {
        packages[dependencyKey] = {
          dev: !!dependency.dev,
          inPackageJson: false,
          version: dependency.version.replace('^', ''),
        };
      }
    }
  }

  return packages;
}

/**
 * Gets all packages from the project dependency file, matching packageRegex, with their
 * respective @latest version.
 * @param packageRegex - RegExp to filter for packages.
 */
export async function getPackageVersions(
  packageRegex: RegExp,
  projectPath: string,
): Promise<PackageVersions> {
  const packages: Packages = await getPackages(packageRegex, projectPath);
  const versionPromises: Promise<PackageVersions>[] = [];
  for (const packageName of Object.keys(packages)) {
    versionPromises.push(
      (async () => ({
        [packageName]: {
          npm: await latestVersion(packageName),
          local: packages[packageName].version,
          dev: packages[packageName].dev,
          inPackageJson: packages[packageName].inPackageJson,
        },
      }))(),
    );
  }

  const packageVersions: PackageVersions[] = await Promise.all(versionPromises);

  const returnPackages: PackageVersions = {};
  for (const pkg of packageVersions) {
    const packageName: string = Object.keys(pkg)[0];
    returnPackages[packageName] = pkg[packageName];
  }

  return returnPackages;
}

/**
 * Checks if the current working directory is a Jovo Project.
 */
export function checkForProjectDirectory(isInProjectDirectory: boolean): void {
  if (!isInProjectDirectory) {
    Log.spacer();
    Log.warning('To use this command, please go into the directory of a valid Jovo project.');
    Log.spacer();
    process.exit(126);
  }
}

/**
 * Customizer for _.mergeWith() to merge arrays instead of overwriting.
 * @param objValue - Array to merge into source.
 * @param srcValue - Source array.
 */
export function mergeArrayCustomizer(target: unknown[], source: unknown[]): unknown[] | undefined {
  // Since _.merge simply overwrites the original array, concatenate them instead.
  if (Array.isArray(target) && Array.isArray(source)) {
    return target.concat(source);
  }
}

/**
 * Strips ANSI escape codes from the provided string.
 * @param output - String potentially containing ANSI escape codes to be stripped.
 */
export function getRawString(output: string): string {
  return stripAnsi(output);
}

/**
 * Returns platform-specific resolved locales. If no locale map is specified, returns [locale].
 * @param locale - Locale for which to return resolved locales.
 * @param supportedLocales - Array of supported locales, required to match glob patterns such as en-*.
 * @param localeMap - Optional locale map from the plugin configuration.
 */
export function getResolvedLocales(
  locale: string,
  supportedLocales: readonly string[],
  localeMap?: LocaleMap,
): string[] {
  const resolvedLocales: string[] | undefined = _get(localeMap, locale);

  if (resolvedLocales) {
    if (!Array.isArray(resolvedLocales)) {
      throw new JovoCliError({ message: `Locale ${locale} does not resolve to an array.` });
    }

    const globPattern: string | undefined = resolvedLocales.find((locale) =>
      /[a-zA-Z]{2}-\*/.test(locale),
    );

    if (globPattern) {
      const genericLocale: string = globPattern.replace('-*', '');

      return supportedLocales.filter((locale) => locale.includes(genericLocale));
    }

    return resolvedLocales;
  }

  return [locale];
}

/**
 * Converts the provided programming language to Pascal Case
 * @param lng - Programming language to convert
 */
export function getLanguagePascalCase(lng: SupportedLanguages): string {
  switch (lng) {
    case 'typescript':
      return 'TypeScript';
    case 'javascript':
      return 'JavaScript';
    default:
      return '';
  }
}
