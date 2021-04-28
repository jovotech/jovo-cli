import { execAsync, JovoCliError, MarketplacePlugin } from '@jovotech/cli-core';
import downloadGH from 'download-git-repo';
export * from './Prompts';
export * as TemplateBuilder from './TemplateBuilder';

/**
 * Downloads and extracts a template.
 * @param projectPath - Path to download and extract the template to.
 */
export async function downloadTemplate(projectPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    downloadGH('jovotech/jovo-template', projectPath, (error: Error) => {
      if (error) {
        return reject(error);
      }

      resolve();
    });
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
      name: 'FileDB',
      module: 'FileDb',
      package: '@jovotech/db-filedb',
      description: 'Store user data in a local JSON file for fast prototyping and debugging',
      tags: 'databases',
    },
    {
      name: 'Amazon Alexa',
      module: 'Alexa',
      cliModule: 'AlexaCli',
      package: '@jovotech/platform-alexa-tmp',
      description: "Build apps for Amazon's Alexa assistant platform",
      tags: 'platforms',
    },
    {
      name: 'ExpressJs',
      module: 'express',
      package: '@jovotech/server-express',
      description: 'ExpressJs Server',
      tags: 'server',
    },
    {
      name: 'AWS Lambda',
      module: 'Lambda',
      package: '@jovotech/server-lambda',
      description: 'Serverless hosting solution by AWS',
      tags: 'server',
    },
  ];

  // Convert tags into arrays.
  for (const plugin of plugins) {
    plugin.tags = (plugin.tags as string).replace(/\s/g, '').split(',');
  }

  return plugins;
}
