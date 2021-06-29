import { ExecOptions, exec } from 'child_process';
import { JovoCliError } from 'jovo-cli-core';
import _get from 'lodash.get';

export * from './Interfaces';

export function execAsync(cmd: string, options: ExecOptions = {}): Promise<string> {
  return new Promise((res, rej) => {
    exec(cmd, options, (err, stdout, stderr) => {
      if (err) {
        return rej(err);
      }
      if (stderr && !stdout) {
        return rej(stderr);
      }

      res(stdout);
    });
  });
}

export function getAskErrorV2(method: string, stderr: string): JovoCliError {
  const module: string = 'jovo-cli-platform-alexa';
  const splitter: string = '[Error]: ';

  const errorIndex: number = stderr.indexOf(splitter);
  if (errorIndex > -1) {
    const errorString: string = stderr.substring(errorIndex + splitter.length);
    const parsedError = JSON.parse(errorString);
    const payload = _get(parsedError, 'detail.response', parsedError);
    const message: string = payload.message;
    let violations: string = '';

    if (payload.violations) {
      for (const violation of payload.violations) {
        violations += violation.message;
      }
    }

    if (payload.detail) {
      violations = payload.detail.response.message;
    }

    return new JovoCliError(`${method}: ${message}`, module, violations);
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
    const parsedError: string = stderr.substring(i);
    const match = pathRegex.exec(parsedError);

    // File-specific error messages
    if (match && match.length > 2) {
      if (match[2] === 'cli_config') {
        return new JovoCliError(
          `ASK CLI is unable to find your configuration file at ${match[1]}.`,
          module,
          "Please configure at least one ask profile using the command 'ask configure'.",
        );
      }

      return new JovoCliError(
        `ASK CLI is unable to find your ${match[2]} at ${match[1]}.`,
        module,
        "If this error persists, try rebuilding your platform folder with 'jovo build'.",
      );
    }
  }

  return new JovoCliError(stderr, module);
}
