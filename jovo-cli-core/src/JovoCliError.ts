import chalk from 'chalk';
import { ERROR } from './utils';

export class JovoCliError extends Error {
  private errorMsg: string[] = [];

  constructor(private msg: string, private module: string, private hint?: string) {
    super();
  }

  logError() {
    this.errorMsg.push(`${ERROR} ${chalk.bgRed.bold(`${this.msg}\n`)}`);
  }

  logProperty(key: string, value: string) {
    key = `${key}:`.padEnd(10);
    this.errorMsg.push(`${chalk.bold(key)}${value}`);
  }

  toString() {
    this.logError();
    this.logProperty('Module', this.module);

    if (this.hint) {
      this.logProperty('Hint', this.hint);
    }

    return `\n${this.errorMsg.join('\n')}\n`;
  }
}
