import { ExecOptions, exec } from 'child_process';
import { JovoCliError } from 'jovo-cli-core';

export * from './Interfaces';

export function execAsync(cmd: string, options: ExecOptions = {}): Promise<string> {
  return new Promise((res, rej) => {
    exec(cmd, options, (err, stdout, stderr) => {
      if (err) {
        return rej(err);
      }
      if (stderr) {
        return rej(stderr);
      }

      res(stdout);
    });
  });
}

export function getAskErrorV2(method: string, stderr: string) {
  const module = 'jovo-cli-platform-alexa';
  const splitter = '[Error]: ';
  const i = stderr.indexOf(splitter);
  if (i > -1) {
    try {
      const json = stderr.substring(i + splitter.length);
      const parsedError = JSON.parse(json);

      const payload = parsedError.response ? parsedError.response : parsedError;

      const message = payload.message;
      let violations = '';

      if (payload.violations) {
        for (const violation of payload.violations) {
          violations += violation.message;
        }
      }
      return new JovoCliError(`${method}:${message}`, module, violations);
    } catch (err) {
      return new JovoCliError(`${method}:${stderr}`, module);
    }
  }

  return new JovoCliError(stderr, module);
}
