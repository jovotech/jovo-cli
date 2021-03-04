import chalk from 'chalk';
import { ERROR, printWarning } from './utils';

export class JovoCliError extends Error {
  private error: string[] = [];

  constructor(private msg: string, private module: string, private hint?: string) {
    super();
  }

  logError() {
    this.error.push(`${ERROR} ${chalk.bgRed.bold(`${this.msg}\n`)}`);
  }

  logProperty(key: string, value: string) {
    key = `${key}:`.padEnd(10);
    this.error.push(`${chalk.bold(key)}${value}`);
  }

  toString() {
    this.logError();
    this.logProperty('Module', this.module);

    if (this.hint) {
      this.logProperty('Hint', this.hint);
    }

    this.error.push(
      chalk.grey(
        '\nIf you think this is not on you, you can submit an issue here: https://github.com/jovotech/jovo-cli/issues.',
      ),
    );

    return `\n${this.error.join('\n')}\n`;
  }
}
