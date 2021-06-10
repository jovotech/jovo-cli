import chalk from 'chalk';
import { ERROR_PREFIX } from './constants';
import { printComment } from './prints';
import { Log, LogLevel } from './Logger';

export class JovoCliError extends Error {
  constructor(
    readonly message: string,
    readonly module: string = 'JovoCliCore',
    readonly details?: string,
    readonly hint?: string,
    readonly learnMore?: string,
  ) {
    super(message);
  }

  private static addProperty(key: string, value: string, logLevel = LogLevel.Error): void {
    Log.info(`${chalk.bold(key)}:`, { prefix: ERROR_PREFIX, logLevel });
    Log.info(value, {
      indent: 1,
      prefix: ERROR_PREFIX,
      logLevel,
    });
  }

  static print(error: JovoCliError): void {
    Log.spacer();
    Log.error(`Error: ${'-'.repeat(80)}`);
    Log.spacer(' ', 80, { prefix: ERROR_PREFIX, logLevel: LogLevel.Error });
    this.addProperty('Message', error.message);
    this.addProperty('Module', error.module);

    if (error.details) {
      this.addProperty('Details', error.details);
    }

    if (error.hint) {
      this.addProperty('Hint', error.hint);
    }

    if (error.learnMore) {
      this.addProperty('Learn more', error.learnMore);
    }

    if (error.stack) {
      Log.info(`${ERROR_PREFIX}`, { logLevel: LogLevel.Debug });
      this.addProperty('Stack', error.stack, LogLevel.Debug);
    }

    Log.spacer(' ', 80, { prefix: ERROR_PREFIX, logLevel: LogLevel.Error });
    Log.info(
      printComment(
        'If you think this is not on you, you can submit an issue here: https://github.com/jovotech/jovo-cli/issues.',
      ),
      { prefix: ERROR_PREFIX, logLevel: LogLevel.Error },
    );
    Log.spacer();
  }
}
