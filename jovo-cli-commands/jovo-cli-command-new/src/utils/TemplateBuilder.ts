import { join as joinPaths } from 'path';
import { omit } from 'lomit';
import _set from 'lodash.set';
import { copyFileSync, readFileSync, rmdirSync, rmSync, writeFileSync } from 'fs';
import latestVersion from 'latest-version';
import {
  Config as ProjectConfig,
  JovoCli,
  JovoCliError,
  MarketplacePlugin,
  ProjectProperties,
} from '@jovotech/cli-core';
import { insert } from '.';

export async function build(props: ProjectProperties) {
  const jovo: JovoCli = JovoCli.getInstance();
  const projectPath: string = joinPaths(jovo.$projectPath, props.projectName);
  const projectConfigPath: string = joinPaths(projectPath, ProjectConfig.getFileName());

  // Read project configuration, enhance with platform plugins.
  let projectConfig = readFileSync(projectConfigPath, 'utf-8');
  const cliPluginsComment: string = '// Add Jovo CLI plugins here.';
  for (const platform of props.platforms as MarketplacePlugin[]) {
    projectConfig = insert(
      `const { ${platform.cliModule} } = require(\'${platform.package}/cli\');\n`,
      projectConfig,
      0,
    );

    const index: number = projectConfig.indexOf(cliPluginsComment) + cliPluginsComment.length;
    projectConfig = insert(`\n\t\tnew ${platform.cliModule}(),`, projectConfig, index);
  }
  writeFileSync(projectConfigPath, projectConfig);

  // Mofify package.json.
  const packageJsonPath: string = joinPaths(projectPath, 'package.json');
  let packageJson = require(packageJsonPath);

  for (const platform of props.platforms as MarketplacePlugin[]) {
    try {
      const version: string = await latestVersion(platform.npmPackage);
      _set(packageJson, `dependencies["${platform.npmPackage}"]`, `^${version}`);
    } catch (error) {
      throw new JovoCliError(
        `Could not retrieve latest version for ${platform.npmPackage}`,
        'NewCommand',
      );
    }
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
    isTypeScriptProject ? 'app.ts' : 'app.js',
  );
  let appConfig = readFileSync(appConfigPath, 'utf-8');
  const pluginsComment: string = '// Add Jovo plugins here.';
  for (const platform of props.platforms as MarketplacePlugin[]) {
    appConfig = insert(
      `import { ${platform.module} } from \'${platform.package}\';\n`,
      appConfig,
      0,
    );

    const index: number = appConfig.indexOf(pluginsComment) + pluginsComment.length;
    appConfig = insert(`\n\t\tnew ${platform.module}(),`, appConfig, index);
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
