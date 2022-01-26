import { ProjectConfig, Configurable, JovoCliError } from '@jovotech/cli-core';
import { copyFileSync, readFileSync, unlinkSync, writeFileSync } from 'fs';
import latestVersion from 'latest-version';
import _set from 'lodash.set';
import { join as joinPaths } from 'path';
import { NewContext } from './commands/new';
import { getFormattedPluginInitConfig, insert, loadPlugin } from './utilities';

/**
 * Mofifies dependencies from the project's package.json. Installs configured CLI plugins and
 * potentially removes dependencies and configurations for ESLint/Jest, if omitted.
 * @param context - Current context, containing configured project properties.
 */
export async function modifyDependencies(context: NewContext): Promise<void> {
  const packageJsonPath: string = joinPaths(context.projectName, 'package.json');
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

  // Add CLI platform plugins to project dependencies.
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

  // Add CLI platform plugins to project dependencies
  for (const command of ['build', 'get', 'run', 'new', 'deploy']) {
    const commandPackage: string = `@jovotech/cli-command-${command}`;
    const version: string = await latestVersion(commandPackage);
    _set(packageJson, `devDependencies["${commandPackage}"]`, `^${version}`);
  }

  // Add FileBuilder to project dependencies
  const fileBuilderPackage: string = '@jovotech/filebuilder';
  const fileBuilderVersion: string = await latestVersion(fileBuilderPackage);
  _set(packageJson, `devDependencies["${fileBuilderPackage}"]`, `^${fileBuilderVersion}`);

  writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
}

/**
 * Modifies the project configuration, adding configured CLI plugins with their respective configurations.
 * @param context - Current context, containing configured project properties.
 */
export async function generateProjectConfiguration(context: NewContext): Promise<void> {
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

    // Build default config for CLI plugin (default = '')
    const initConfig: string = await getFormattedPluginInitConfig(platform.cliPlugin);

    projectConfig = insert(
      `\n\t\tnew ${platform.cliModule}(${initConfig}),`,
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
export async function generateAppConfiguration(context: NewContext): Promise<void> {
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
    const loadedPlugin: Configurable = loadPlugin(
      context.projectName,
      platform.package,
      platform.module,
    );
    const initConfig: string = await getFormattedPluginInitConfig(loadedPlugin);

    appConfig = insert(
      `import { ${platform.module} } from \'${platform.package}\';\n`,
      appConfig,
      0,
    );

    appConfig = insert(
      `\n\t\tnew ${platform.module}(${initConfig}),`,
      appConfig,
      appConfig.indexOf(pluginsComment) + pluginsComment.length,
    );
  }
  writeFileSync(appConfigPath, appConfig);
}

export function copyModels(context: NewContext): void {
  // Provide language models for each locale.
  const modelsDirectory: string = 'models';
  for (const locale of context.locales) {
    if (locale === 'en') {
      continue;
    }

    copyFileSync(
      joinPaths(context.projectName, modelsDirectory, 'en.json'),
      joinPaths(context.projectName, modelsDirectory, `${locale}.json`),
    );
  }

  if (!context.locales.includes('en')) {
    unlinkSync(joinPaths(context.projectName, modelsDirectory, 'en.json'));
  }
}
