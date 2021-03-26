import { createWriteStream, unlinkSync, WriteStream } from 'fs';
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import AdmZip from 'adm-zip';
import { join as joinPaths } from 'path';
import { execAsync, JovoCliError, MarketplacePlugin, REPO_URL } from 'jovo-cli-core';

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
) {
  const templateName: string = `${template}_${locale}.zip`;
  const url: string = `${REPO_URL}/v3/${templateName}?language=${language}`;

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
            return reject(new JovoCliError(error.message, 'jovo-cli-command-new'));
          } finally {
            // Delete .zip file.
            unlinkSync(pathToZip);
          }

          return resolve();
        });
      }

      if (res.status === 404) {
        return reject(new JovoCliError('Could not find template.', 'jovo-cli-command-new'));
      }
    } catch (error) {
      return reject(new JovoCliError('Could not download template.', 'jovo-cli-command-new'));
    }
  });
}

export async function runNpmInstall(projectPath: string) {
  try {
    await execAsync('npm install', { cwd: projectPath });
  } catch (error) {
    throw new JovoCliError(error.message, 'jovo-cli-command-new');
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
      module: 'DashbotAnalytics',
      package: '@jovotech/analytics-dashbot',
      description: 'Add conversational analytics to your app',
      tags: 'monitoring, analytics',
    },
    {
      name: 'Google Analytics',
      module: 'GoogleAnalytics',
      package: '@jovotech/analytics-googleanalytics',
      description: 'Track usage data with the popular analytics platform',
      tags: 'monitoring, analytics',
    },
    {
      name: 'DynamoDB',
      module: 'DynamoDb',
      package: '@jovotech/db-dynamodb',
      description: 'Store user data in a DynamoDB database on AWS',
      tags: 'databases',
    },
    {
      name: 'FileDB',
      module: 'FileDb',
      package: '@jovotech/db-filedb',
      description: 'Store user data in a local JSON file for fast prototyping and debugging',
      tags: 'databases',
    },
    {
      name: 'MongoDB',
      module: 'MongoDb',
      package: '@jovotech/db-mongodb',
      description: 'Store user data in a MongoDB database',
      tags: 'databases',
    },
    {
      name: 'Amazon Alexa',
      module: 'Alexa',
      cliModule: 'AlexaCli',
      package: 'jovo-platform-alexa',
      description: "Build apps for Amazon's Alexa assistant platform",
      tags: 'platforms',
    },
    {
      name: 'Google Assistant (Conversational)',
      module: 'GoogleAssistant',
      cliModule: 'GoogleAssistantCli',
      package: 'jovo-platform-googleassistantconv',
      description: "Build Conversational Actions for Google's Assistant platform",
      tags: 'platforms',
    },
  ];

  // Convert tags into arrays.
  for (const plugin of plugins) {
    plugin.tags = (plugin.tags as string).replace(/\s/g, '').split(',');
  }

  return plugins;
}
