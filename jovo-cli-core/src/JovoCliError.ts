import * as chalk from 'chalk';

import { ERROR_TYPE } from './Constants';

export class JovoCliError extends Error {
  private errorMsg: string[] = [];

  constructor(
    private msg: string,
    private module: string,
    private hint?: string,
    private type: ERROR_TYPE = ERROR_TYPE.ERR,
  ) {
    super();
  }

  logError() {
    this.errorMsg.push(chalk.bgRed.bold(`[${this.type}] ${this.msg}\n`));
  }

  logWarning() {
    this.errorMsg.push(chalk.bgYellow.bold(`[${this.type}] ${this.msg}\n`));
  }

  logProperty(key: string, value: string) {
    key = `${key}:`.padEnd(10);
    this.errorMsg.push(`${chalk.bold(key)}${value}`);
  }

  toString() {
    switch (this.type) {
      case ERROR_TYPE.ERR:
        this.logError();
        break;
      case ERROR_TYPE.WARN:
        this.logWarning();
        break;
      default:
    }

    this.logProperty('Module', this.module);

    if (this.hint) {
      this.logProperty('Hint', this.hint);
    }

    return `\n${this.errorMsg.join('\n')}\n`;
  }
}
