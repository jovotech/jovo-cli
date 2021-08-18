import { Config as ProjectConfig, deleteFolderRecursive, JovoCliError } from '@jovotech/cli-core';
import { copyFileSync, readFileSync, unlinkSync, writeFileSync } from 'fs';
import latestVersion from 'latest-version';
import _set from 'lodash.set';
import { omit } from 'lomit';
import { join as joinPaths } from 'path';
import util from 'util';
import { NewContext } from './commands/new';
import { insert } from './utilities';

/**
 * Mofifies dependencies from the project's package.json. Installs configured CLI plugins and
 * potentially removes dependencies and configurations for ESLint/Jest, if omitted.
 * @param context - Current context, containing configured project properties.
 */
export async function modifyDependencies(context: NewContext): Promise<void> {
  const packageJsonPath: string = joinPaths(context.projectName, 'package.json');
  let packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

  // Add CLI plugins to project dependencies.
  for (const platform of context.platforms) {
    try {
      const version: string = await latestVersion(platform.package);
      _set(packageJson, `dependencies["${platform.package}"]`, `^${version}`);
    } catch (error) {
      throw new JovoCliError({
        message: `Could not retrieve latest version for ${platform.package}`,
        module: 'NewCommand',
      });
    }
  }

  const omittedPackages: string[] = [];
  // Check if ESLint is enabled, if not, delete package.json entries and config.
  if (!context.linter) {
    unlinkSync(joinPaths(context.projectName, '.eslintrc.js'));
    omittedPackages.push(
      'devDependencies.eslint',
      'devDependencies.@typescript-eslint/eslint-plugin',
      'devDependencies.@typescript-eslint/parser',
      'devDependencies.eslint-config-prettier',
      'devDependencies.eslint-plugin-prettier',
      'scripts.eslint',
    );
  }

  // Check if Jest is enabled, if not, delete package.json entries and config.
  if (!context.unitTesting) {
    unlinkSync(joinPaths(context.projectName, 'jest.config.js'));
    deleteFolderRecursive(joinPaths(context.projectName, 'test'));
    omittedPackages.push(
      'devDependencies.jest',
      'devDependencies.ts-jest',
      'devDependencies.@types/jest',
      'scripts.test',
    );
  }

  packageJson = omit(packageJson, omittedPackages);
  writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
}

/**
 * Modifies the project configuration, adding configured CLI plugins with their respective configurations.
 * @param context - Current context, containing configured project properties.
 */
export function generateProjectConfiguration(context: NewContext): void {
  const projectConfigPath: string = joinPaths(context.projectName, ProjectConfig.getFileName());

  // Read project configuration, enhance with platform plugins.
  let projectConfig = readFileSync(projectConfigPath, 'utf-8');
  const cliPluginsComment = '// Add Jovo CLI plugins here';
  for (const platform of context.platforms) {
    if (!platform.cliModule) {
      continue;
    }

    projectConfig = insert(
      `const { ${platform.cliModule} } = require(\'${platform.package}\');\n`,
      projectConfig,
      0,
    );

    // Build default config for CLI plugin (default = '').
    let defaultConfig: string = '';

    if (Object.keys(platform.cliPlugin.$config).length) {
      // Serialize the plugin's default config for further processing.
      const unformattedConfig: string = util.inspect(platform.cliPlugin.$config, {
        depth: null,
        colors: false,
      });

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      // Format default config with correct indentation.
      platform.cliPlugin.$config[util.inspect.custom] = () =>
        unformattedConfig.replace(/\n/g, '\n\t\t');

      console.log(unformattedConfig.replace(/\n/g, '\n\tŧ'));
      console.log(util.inspect(platform.cliPlugin.$config, { depth: null, colors: false }));

      // Overwrite default config with formatted config.
      defaultConfig = util.inspect(platform.cliPlugin.$config, { depth: null, colors: false });
    }

    projectConfig = insert(
      `\n\t\tnew ${platform.cliModule}(${defaultConfig}),`,
      projectConfig,
      projectConfig.indexOf(cliPluginsComment) + cliPluginsComment.length,
    );
  }
  writeFileSync(projectConfigPath, projectConfig);
}

/**
 * Mofifies the app configuration, adding configured Framework plugins.
 * @param context - Current context, containing configured project properties.
 */
export function generateAppConfiguration(context: NewContext): void {
  const packageJsonPath: string = joinPaths(context.projectName, 'package.json');
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
  // Read Jovo configuration, modify and enhance with platform plugins.
  const isTypeScriptProject: boolean =
    packageJson.hasOwnProperty('devDependencies') &&
    packageJson.devDependencies.hasOwnProperty('typescript');
  const appConfigPath: string = joinPaths(
    context.projectName,
    'src',
    isTypeScriptProject ? 'app.ts' : 'app.js',
  );
  let appConfig = readFileSync(appConfigPath, 'utf-8');
  const pluginsComment = '// Add Jovo plugins here';
  for (const platform of context.platforms) {
    appConfig = insert(
      `import { ${platform.module} } from \'${platform.package}\';\n`,
      appConfig,
      0,
    );

    appConfig = insert(
      `\n\t\tnew ${platform.module}(),`,
      appConfig,
      appConfig.indexOf(pluginsComment) + pluginsComment.length,
    );
  }
  writeFileSync(appConfigPath, appConfig);

  // Provide language models for each locale.
  const modelsDirectory = 'models';
  for (const locale of context.locales) {
    if (locale === 'en') {
      continue;
    }

    copyFileSync(
      joinPaths(context.projectName, modelsDirectory, 'en.json'),
      joinPaths(context.projectName, modelsDirectory, `${locale}.json`),
    );
  }
}
