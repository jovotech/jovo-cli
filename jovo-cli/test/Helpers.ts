import { spawn } from 'child_process';
import * as path from 'path';

/**
 * Run a "jovo" command async
 *
 * @export
 * @param {string} command The jovo command
 * @param {string[]} parameters The additional parameters
 * @param {string} cwd The directory to run it in
 * @param {string} waitText The text to wait for in the output
 * @returns
 */
export function runJovoCommand(
  command: string,
  parameters: string[],
  cwd: string,
  waitText: string[] | string | null,
  errorText?: string,
): Promise<string> {
  parameters.unshift(command);

  if (waitText && !Array.isArray(waitText)) {
    waitText = [waitText];
  }

  return new Promise((resolve, reject) => {
    const child = spawn(path.join(process.cwd(), 'bin/run'), parameters, {
      cwd,
    });

    child.stderr.on('data', (data) => {
      child.kill();
      if (errorText && data.toString().indexOf(errorText) > -1) {
        return resolve(data.toString());
      }

      reject(new Error(data.toString()));
    });

    child.stdout.on('data', (data) => {
      if (!waitText) {
        return reject();
      }

      for (const text of waitText) {
        if (data.toString().indexOf(text) > -1) {
          child.kill();
          return resolve(data.toString());
        }
      }
    });
  });
}
