import chalk from 'chalk';

export class JovoCliError extends Error {
  private errorMsg: string[] = [];

  constructor(private msg: string, private module: string, private hint?: string) {
    super();
  }

  logError() {
    this.errorMsg.push(chalk.bgRed.bold(`[ERR] ${this.msg}\n`));
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
