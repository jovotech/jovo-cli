import { join as joinPaths } from 'path';
import { omit } from 'lomit';
import _set from 'lodash.set';
import { ProjectConfig, JovoCli, ProjectProperties } from 'jovo-cli-core';
import { copyFileSync, readFileSync, rmdirSync, rmSync, writeFileSync } from 'fs';
import latestVersion from 'latest-version';
import { PLATFORMS } from './Constants';

export async function build(props: ProjectProperties) {
  const jovo: JovoCli = JovoCli.getInstance();
  const projectPath: string = joinPaths(jovo.$projectPath, props.projectName);
  const projectConfigPath: string = joinPaths(projectPath, ProjectConfig.getFileName());

  // Read project configuration, enhance with platform plugins.
  let projectConfig = readFileSync(projectConfigPath, 'utf-8');
  const cliPluginsComment: string = '// Add Jovo CLI plugins here.';
  for (const selectedPlatform of props.platforms) {
    const platform = PLATFORMS[selectedPlatform];
    projectConfig = insert(
      `const { ${platform.cliPlugin} } = require(\'${platform.path}\');\n`,
      projectConfig,
      0,
    );

    const index: number = projectConfig.indexOf(cliPluginsComment) + cliPluginsComment.length;
    projectConfig = insert(`\n\t\tnew ${platform.cliPlugin}(),`, projectConfig, index);
  }
  writeFileSync(projectConfigPath, projectConfig);

  // Mofify package.json.
  const packageJsonPath: string = joinPaths(projectPath, 'package.json');
  let packageJson = require(packageJsonPath);

  for (const selectedPlatform of props.platforms) {
    const platform = PLATFORMS[selectedPlatform];
    _set(packageJson, `dependencies["${platform.path}"]`, `^${await latestVersion(platform.path)}`);
  }

  const omittedPackages: string[] = [];
  // Check if ESLint is set, if not, delete package.json entries and config.
  if (!props.linter) {
    rmSync(joinPaths(projectPath, '.eslintrc.js'));
    omittedPackages.push(
      'devDependencies.eslint',
      'devDependencies.@typescript-eslint/eslint-plugin',
      'devDependencies.@typescript-eslint/parser',
      'devDependencies.eslint-config-prettier',
      'devDependencies.eslint-plugin-prettier',
      'scripts.eslint',
    );
  }

  if (!props.unitTesting) {
    rmSync(joinPaths(projectPath, 'jest.config.js'));
    rmdirSync(joinPaths(projectPath, 'test'), { recursive: true });
    omittedPackages.push(
      'devDependencies.jest',
      'devDependencies.ts-jest',
      'devDependencies.@types/jest',
      'scripts.test',
    );
  }

  packageJson = omit(packageJson, omittedPackages);
  writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

  // Read Jovo configuration, modify and enhance with platform plugins.
  const isTypeScriptProject: boolean =
    packageJson.hasOwnProperty('devDependencies') &&
    packageJson.devDependencies.hasOwnProperty('typescript');
  const appConfigPath: string = joinPaths(
    projectPath,
    'src',
    isTypeScriptProject ? 'jovo.config.ts' : 'jovo.config.js',
  );
  let appConfig = readFileSync(appConfigPath, 'utf-8');
  const pluginsComment: string = '// Add Jovo plugins here.';
  for (const selectedPlatform of props.platforms) {
    const platform = PLATFORMS[selectedPlatform];
    appConfig = insert(
      `import { ${platform.frameworkPlugin} } from \'${platform.path}\';\n`,
      appConfig,
      0,
    );

    const index: number = appConfig.indexOf(pluginsComment) + pluginsComment.length;
    appConfig = insert(`\n\t\tnew ${platform.frameworkPlugin}(),`, appConfig, index);
  }
  writeFileSync(appConfigPath, appConfig);

  // Provide language models for each locale.
  const modelsDirectory: string = 'models';
  for (const locale of props.locales) {
    copyFileSync(
      joinPaths(projectPath, modelsDirectory, 'en.json'),
      joinPaths(projectPath, modelsDirectory, `${locale}.json`),
    );
  }
}

/**
 * Inserts a substring into a provided string at an index.
 * @param substr - Substring to be inserted.
 * @param str - String to insert the substring into.
 * @param index - Position of where to insert the substring.
 */
function insert(substr: string, str: string, index: number): string {
  return str.substring(0, index) + substr + str.substring(index);
}
