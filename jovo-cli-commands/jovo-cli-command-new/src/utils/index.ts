import { createWriteStream, unlinkSync, WriteStream } from 'fs';
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import AdmZip from 'adm-zip';
import { join as joinPaths } from 'path';
import { execAsync, JovoCli, JovoCliError, REPO_URL } from 'jovo-cli-core';

const jovo: JovoCli = JovoCli.getInstance();

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

export async function runNpmInstall() {
  try {
    await execAsync('npm install', { cwd: jovo.$projectPath });
    // Update jovo-framework dependency in package.json.
    await execAsync('npm i jovo-framework -S', { cwd: jovo.$projectPath });
  } catch (error) {
    throw new JovoCliError(error.message, 'jovo-cli-command-new');
  }
}
