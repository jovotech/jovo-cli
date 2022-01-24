import { exec, ExecException, ExecOptions } from 'child_process';
import { existsSync, lstatSync, readdirSync, readFileSync, rmdirSync, unlinkSync } from 'fs';
import latestVersion from 'latest-version';
import _get from 'lodash.get';
import _intersectionBy from 'lodash.intersectionby';
import { join as joinPaths } from 'path';
import stripAnsi from 'strip-ansi';
import {
  Dependencies,
  ExecResponse,
  LocaleMap,
  Package,
  PackageFile,
  SupportedLanguages,
} from './interfaces';
import { JovoCliError } from './JovoCliError';
import { Log } from './Logger';

/**
 * Provides own version of execSync by returning a promise on exec().
 * This offers a few advantages, such as handling stream output more precise.
 * @param cmd - Command to execute, can be an array which will be joined with together with whitespaces
 * @param options - Options to pass to exec()
 */
export function execAsync(
  cmd: string | string[],
  options: ExecOptions = {},
): Promise<ExecResponse> {
  return new Promise((resolve, reject) => {
    if (!Array.isArray(cmd)) {
      cmd = [cmd];
    }
    exec(cmd.join(' '), options, (error: ExecException | null, stdout: string, stderr: string) => {
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
 * Returns packages with their respective versions from project dependency files, comparing dependencies listed
 * in both package.json and package-lock.json.
 * @param packageRegex - RegExp to filter for packages
 * @param projectPath - Path for the current project
 */
export function getPackages(packageRegex: RegExp): Package[] {
  // Get all packages matching the regex from either package-lock.json, or package.json
  const packageFiles: string[] = ['package-lock.json', 'package.json'].filter((file: string) =>
    existsSync(file),
  );

  if (!packageFiles.length) {
    throw new JovoCliError({
      message: "Could not find an NPM dependency file, such as your project's package.json.",
      hint: 'Try creating one by running "npm init" inside your project.',
    });
  }

  const versionRegex: RegExp = /^\^?\d{1,2}\.\d{1,2}\.\d{1,2}(?:-(?:alpha|beta).\d{1,2})?$/;
  const parseDependencyVersion = (dependencies: Dependencies, isDev?: boolean): Package[] => {
    const packages: Package[] = [];

    for (const [dependencyKey, dependency] of Object.entries(dependencies)) {
      if (!dependencyKey.match(packageRegex)) {
        continue;
      }

      if (typeof dependency === 'string') {
        if (dependency.match(versionRegex))
          packages.push({
            name: dependencyKey,
            version: { local: dependency.replace('^', '') },
            isDev,
          });
      } else {
        if (dependency.version.match(versionRegex)) {
          packages.push({
            name: dependencyKey,
            version: { local: dependency.version.replace('^', '') },
            isDev,
          });
        }
      }
    }

    return packages;
  };

  try {
    const packages: Package[] = [];

    for (const packageFile of packageFiles) {
      const rawPackageFileContent: string = readFileSync(packageFile, 'utf-8');
      const packageFileContent: PackageFile = JSON.parse(rawPackageFileContent);

      packages.push(
        ...parseDependencyVersion(packageFileContent.dependencies || {}),
        ...parseDependencyVersion(packageFileContent.devDependencies || {}, true),
      );
    }
    return _intersectionBy(packages, 'name');
  } catch (error) {
    console.log(error);
    throw new JovoCliError({
      message: `Something went wrong while reading your file.`,
    });
  }
}

/**
 * Gets all packages from the project dependency file, matching packageRegex, with their
 * respective @latest version.
 * @param packageRegex - RegExp to filter for packages.
 */
export async function getPackageVersions(packageRegex: RegExp): Promise<Package[]> {
  const packages: Package[] = getPackages(packageRegex);
  const versionPromises: Promise<Package>[] = [];
  for (const pkg of packages) {
    versionPromises.push(
      (async () => ({
        ...pkg,
        ...{ version: { ...pkg.version, npm: await latestVersion(pkg.name) } },
      }))(),
    );
  }

  return await Promise.all(versionPromises);
}

export async function getOutdatedPackages(packageRegex: RegExp): Promise<Package[]> {
  const packageVersions: Package[] = await getPackageVersions(packageRegex);
  const outdatedPackages: Package[] = [];

  for (const pkg of packageVersions) {
    if (pkg.version.local !== pkg.version.npm) {
      outdatedPackages.push(pkg);
    }
  }

  return outdatedPackages;
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

/**
 * Checks whether the provided error is a JovoCliError.
 * Since the Jovo CLI uses both global and local modules, an error thrown in a local module
 * is not the same instance of a JovoCliError as in a global one.
 * @param error - Error to check
 */
export function isJovoCliError(error: Error): error is JovoCliError {
  return error instanceof JovoCliError || !!(error as JovoCliError)['properties'];
}
