import { readFileSync } from 'fs';
import chalk from 'chalk';
import { cli as ux } from 'cli-ux';
import { JovoCliError } from 'jovo-cli-core';

import { AskSkillList } from './Interfaces';

import { getAskConfigPath } from './Paths';

export * from './Interfaces';
export * from './Paths';

export function getAskConfig() {
  const content: string = readFileSync(getAskConfigPath(), 'utf-8');
  return JSON.parse(content);
}

/**
 * Generates a choice list out of an ASK skill list.
 * @param askSkillList - List of Alexa Skills returned by the ASK CLI.
 */
export function prepareSkillList(askSkillList: AskSkillList) {
  const choices: Array<{ name: string; value: string }> = [];
  for (const item of askSkillList.skills) {
    const key: string = Object.keys(item.nameByLocale)[0];
    let message: string = item.nameByLocale[key];

    const stage: string = item.stage === 'development' ? 'dev' : (item.stage as string);
    message +=
      ` ${stage === 'live' ? chalk.green(stage) : chalk.blue(stage)} ` +
      `- ${item.lastUpdated.substr(0, 10)}` +
      ` ${chalk.grey(item.skillId)}`;

    choices.push({
      name: message,
      value: item.skillId,
    });
  }
  return choices;
}

export function getAskError(method: string, stderror: string): JovoCliError {
  const module: string = 'jovo-cli-platform-alexa';
  const splitter: string = '[Error]: ';

  const errorIndex: number = stderror.indexOf(splitter);
  if (errorIndex > -1) {
    const errorString: string = stderror.substring(errorIndex + splitter.length);
    const parsedError = JSON.parse(errorString);
    const payload = parsedError.response ? parsedError.response : parsedError;
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
    if (stderror.includes('CliFileNotFoundError')) {
      i = stderror.indexOf('CliFileNotFoundError');
      pathRegex = /File (\/.*\/)+(.*) not exists\./g;
    } else if (stderror.includes('ENOENT')) {
      i = stderror.indexOf('ENOENT');
      pathRegex = /'(\/.*\/)*(.*)'/g;
    } else {
      return new JovoCliError(stderror, module);
    }

    // Check for different error messages, if a file cannot be found.
    const parsedError: string = stderror.substring(i);
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

  return new JovoCliError(stderror, module);
}
