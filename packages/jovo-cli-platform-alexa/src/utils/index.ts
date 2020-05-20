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
  } else {
    // Try parsing for alternative error message.
    let i: number, pathRegex: RegExp;

    // Depending on the type of error message, try using different regular expressions to parse the actual error message.
    if (stderr.includes('CliFileNotFoundError')) {
      i = stderr.indexOf('CliFileNotFoundError');
      pathRegex = /File (\/.*\/)+(.*) not exists\./g;
    } else if (stderr.includes('ENOENT')) {
      i = stderr.indexOf('ENOENT');
      pathRegex = /'(\/.*\/)*(.*)'/g;
    } else {
      return new JovoCliError(stderr, module);
    }

    // Check for different error messages, if a file cannot be found.
    const parsedError = stderr.substring(i);
    const match = pathRegex.exec(parsedError);

    // File-specific error messages
    if (match && match.length > 2) {
      if (match[2] === 'cli_config') {
        return new JovoCliError(
          `ASK CLI is unable to find your configuration file at ${match[1]}.`,
          'jovo-cli-platform-alexa',
          "Please configure at least one ask profile using the command 'ask configure'.",
        );
      }

      return new JovoCliError(
        `ASK CLI is unable to find your ${match[2]} at ${match[1]}.`,
        'jovo-cli-platform-alexa',
        "If this error persists, try rebuilding your platform folder with 'jovo build'.",
      );
    }
  }

  return new JovoCliError(stderr, module);
}
