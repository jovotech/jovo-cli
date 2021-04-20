import { createWriteStream, existsSync, mkdirSync, unlinkSync, WriteStream } from 'fs';
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import AdmZip from 'adm-zip';
import { join as joinPaths, resolve } from 'path';
import { execAsync, JovoCliError, MarketplacePlugin, REPO_URL } from '@jovotech/cli-core';
import { copySync } from 'fs-extra';
import chalk from 'chalk';

export * from './Prompts';
export * as TemplateBuilder from './TemplateBuilder';

/**
 * Downloads and extracts a template.
 * @param projectPath - Path to download and extract the template to.
 * @param template - The template to download.
 * @param locale - Locale of the template.
 * @param language - Programming language of the template.
 */
export async function downloadAndExtract(
  projectPath: string,
  template: string,
  locale: string,
  language: string,
): Promise<void> {
  const templateName = `${template}_${locale}.zip`;
  const url = `${REPO_URL}/v3/${templateName}?language=${language}`;

  const config: AxiosRequestConfig = {
    method: 'GET',
    responseType: 'stream',
    url,
  };

  return new Promise<void>(async (resolve, reject) => {
    try {
      const res: AxiosResponse = await axios.request(config);

      if (res.status === 200) {
        const pathToZip: string = joinPaths(projectPath, templateName);
        const writeStream: WriteStream = createWriteStream(pathToZip);
        // Write response data to compressed .zip file.
        res.data.pipe(writeStream).on('close', () => {
          // Unzip .zip file.
          try {
            const zip: AdmZip = new AdmZip(pathToZip);
            zip.extractAllTo(projectPath, true);
          } catch (error) {
            return reject(new JovoCliError(error.message, '@jovotech/cli-command-new'));
          } finally {
            // Delete .zip file.
            unlinkSync(pathToZip);
          }

          return resolve();
        });
      }

      if (res.status === 404) {
        return reject(new JovoCliError('Could not find template.', '@jovotech/cli-command-new'));
      }
    } catch (error) {
      return reject(new JovoCliError('Could not download template.', '@jovotech/cli-command-new'));
    }
  });
}

export async function runNpmInstall(projectPath: string): Promise<void> {
  try {
    await execAsync('npm install', { cwd: projectPath });
  } catch (error) {
    // Suppress NPM warnings.
    throw new JovoCliError(error.stderr, '@jovotech/cli-command-new');
  }
}

/**
 * Inserts a substring into a provided string at an index.
 * @param substr - Substring to be inserted.
 * @param str - String to insert the substring into.
 * @param index - Position of where to insert the substring.
 */
export function insert(substr: string, str: string, index: number): string {
  return str.substring(0, index) + substr + str.substring(index);
}

/**
 * Gets plugins from Jovo Marketplace.
 */
export function fetchMarketPlace(): MarketplacePlugin[] {
  // ToDo: Fetch from API.
  const plugins: MarketplacePlugin[] = [
    {
      name: 'Dashbot Analytics',
      module: 'DashbotUniversal',
      package: '@jovotech/analytics-dashbot',
      npmPackage: 'jovo-analytics-dashbot',
      description: 'Add conversational analytics to your app',
      tags: 'monitoring, analytics',
    },
    {
      name: 'Google Analytics',
      module: 'GoogleAnalytics',
      package: '@jovotech/analytics-googleanalytics',
      npmPackage: 'jovo-analytics-googleanalytics',
      description: 'Track usage data with the popular analytics platform',
      tags: 'monitoring, analytics',
    },
    {
      name: 'DynamoDB',
      module: 'DynamoDb',
      package: '@jovotech/db-dynamodb',
      npmPackage: 'jovo-db-dynamodb',
      description: 'Store user data in a DynamoDB database on AWS',
      tags: 'databases',
    },
    {
      name: 'FileDB',
      module: 'FileDb',
      package: '@jovotech/db-filedb',
      npmPackage: 'jovo-db-filedb',
      description: 'Store user data in a local JSON file for fast prototyping and debugging',
      tags: 'databases',
    },
    {
      name: 'MongoDB',
      module: 'MongoDb',
      package: '@jovotech/db-mongodb',
      npmPackage: 'jovo-db-mongodb',
      description: 'Store user data in a MongoDB database',
      tags: 'databases',
    },
    {
      name: 'Amazon Alexa',
      module: 'Alexa',
      cliModule: 'AlexaCli',
      package: '@jovotech/platform-alexa',
      npmPackage: 'jovo-platform-alexa',
      description: "Build apps for Amazon's Alexa assistant platform",
      tags: 'platforms',
    },
    {
      name: 'Google Assistant (Conversational)',
      module: 'GoogleAssistant',
      cliModule: 'GoogleAssistantCli',
      package: '@jovotech/platform-googleassistantconv',
      npmPackage: 'jovo-platform-googleassistantconv',
      description: "Build Conversational Actions for Google's Assistant platform",
      tags: 'platforms',
    },
    {
      name: 'Jovo Framework',
      module: 'App',
      package: '@jovotech/framework',
      npmPackage: 'jovo-framework',
      description: 'Jovo Framework',
      tags: '',
    },
    {
      name: 'Jovo Debugger',
      module: 'Debugger',
      package: '@jovotech/plugin-debugger',
      npmPackage: 'jovo-plugin-debugger',
      description: 'Jovo Debugger',
      tags: '',
    },
  ];

  // Convert tags into arrays.
  for (const plugin of plugins) {
    plugin.tags = (plugin.tags as string).replace(/\s/g, '').split(',');
  }

  return plugins;
}

/**
 * ! Links available plugins to the new MVP dependency structure.
 * @param projectPath - Project directory. If running this function from within a Jovo project, leave it empty.
 */
export async function linkPlugins(projectPath = ''): Promise<void> {
  if (!existsSync(joinPaths(projectPath, 'node_modules', '@jovotech'))) {
    mkdirSync(joinPaths(projectPath, 'node_modules', '@jovotech'));
  }

  const marketplacePlugins: MarketplacePlugin[] = fetchMarketPlace();
  const packageJson = require(resolve(joinPaths(projectPath, 'package.json')));
  const dependencies: string[] = [
    ...Object.keys(packageJson.dependencies),
    ...Object.keys(packageJson.devDependencies),
  ];
  const linkedPackages: string[] = ['@jovotech/cli-core'];

  for (const pkg of dependencies) {
    if (/^jovo-[a-zA-Z\-]*$/.test(pkg)) {
      const marketplacePlugin: MarketplacePlugin | undefined = marketplacePlugins.find(
        (plugin) => plugin.npmPackage === pkg,
      );

      if (!marketplacePlugin) {
        throw new JovoCliError(`Could not find ${pkg} in marketplace.`, 'NewCommand');
      }

      copySync(
        joinPaths(projectPath, 'node_modules', pkg),
        joinPaths(projectPath, 'node_modules', marketplacePlugin.package),
      );

      // ! Link platforms.
      if (marketplacePlugin.module === 'Alexa') {
        linkedPackages.push('@jovotech/platform-alexa');
      }

      if (marketplacePlugin.module === 'GoogleAssistant') {
        linkedPackages.push('@jovotech/platform-googleassistantconv');
      }
    }
  }

  try {
    await execAsync(`npm link ${linkedPackages.join(' ')}`, { cwd: projectPath });
  } catch (error) {
    throw new JovoCliError(error.stderr, '@jovotech/cli-command-new');
  }
}

export function printUserInput(input: string): string {
  return chalk.blueBright(input);
}
