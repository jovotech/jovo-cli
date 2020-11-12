import { createWriteStream, existsSync, mkdirSync, WriteStream } from 'fs';
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { createGunzip } from 'zlib';
import { join as joinPaths } from 'path';
import { JovoCliError, REPO_URL } from 'jovo-cli-core';

/**
 * Creates an empty project folder.
 */
export async function createEmptyProject(projectPath: string) {
  if (!existsSync(projectPath)) {
    mkdirSync(projectPath);
  }
}

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

  if (!existsSync(projectPath)) {
    mkdirSync(projectPath);
  }

  const config: AxiosRequestConfig = {
    method: 'GET',
    responseType: 'stream',
    url,
  };

  // ToDo: Test!
  try {
    const res: AxiosResponse = await axios.request(config);

    if (res.status === 200) {
      const writeStream: WriteStream = createWriteStream(joinPaths(projectPath, templateName));
      // Pipe response data to zlib to decompress the downloaded .zip file, and pipe that output to a file write stream.
      res.data.pipe(createGunzip()).pipe(writeStream);
    }

    if (res.status === 404) {
      throw new JovoCliError('Could not find template.', 'jovo-cli-command-new');
    }
  } catch (error) {
    if (error instanceof JovoCliError) {
      throw error;
    }
    throw new JovoCliError('Could not download template.', 'jovo-cli-command-new');
  }
}
