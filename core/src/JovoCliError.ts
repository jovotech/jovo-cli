import chalk from 'chalk';
import { ERROR_PREFIX } from './constants';
import { printComment } from './prints';
import { Log, LogLevel } from './Logger';

export interface JovoCliErrorProperties {
  message: string;
  module?: string;
  details?: string;
  hint?: string;
  learnMore?: string;
}

export class JovoCliError extends Error {
  constructor(private readonly properties: JovoCliErrorProperties) {
    super(properties.message);
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
    this.addProperty('Message', error.properties.message);
    this.addProperty('Module', error.properties.module || 'JovoCliCore');

    if (error.properties.details) {
      this.addProperty('Details', error.properties.details);
    }

    if (error.properties.hint) {
      this.addProperty('Hint', error.properties.hint);
    }

    if (error.properties.learnMore) {
      this.addProperty('Learn more', error.properties.learnMore);
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
