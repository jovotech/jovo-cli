import chalk from 'chalk';
import { inspect } from 'util';

import { ERROR, getRawString, WARNING } from '.';

export enum LogLevel {
  None,
  Info,
  Warn,
  Error,
  Raw,
  Debug,
  Verbose,
}

export type Output = string | boolean | number | object;

export type LogOutput<OPTIONS extends LogOptions> = OPTIONS['dry'] extends true
  ? string
  : undefined;

export interface LogOptions {
  logLevel?: LogLevel;
  dry?: boolean;
  indent?: number;
  newLine?: boolean;
  prefix?: string;
}

export class Log {
  private static get level(): LogLevel {
    let logLevel: string | LogLevel = LogLevel.Error;
    if (process.env.JOVO_CLI_LOG_LEVEL) {
      logLevel = process.env.JOVO_CLI_LOG_LEVEL;
    }

    if (typeof logLevel === 'string') {
      logLevel = this.parseLogLevel(logLevel);
    }

    return logLevel;
  }

  /**
   * Parses the log level from string to the corresponding enum value
   */
  private static parseLogLevel(level: string): LogLevel {
    const logLevelCaps: string = level.toUpperCase();

    switch (logLevelCaps) {
      case 'NONE':
        return LogLevel.None;
      case 'INFO':
        return LogLevel.Info;
      case 'WARN':
        return LogLevel.Warn;
      case 'ERROR':
        return LogLevel.Error;
      case 'DEBUG':
        return LogLevel.Debug;
      case 'VERBOSE':
        return LogLevel.Verbose;
      default:
        return LogLevel.Error;
    }
  }

  /**
   * Checks, if the provided level applies to the current log level
   * @param logLevel - Log level to check for
   */
  static isLogLevel(logLevel: LogLevel): boolean {
    return this.level >= logLevel;
  }

  /**
   * Checks if color output is currently supported or not.
   */
  static isRaw(): boolean {
    return (
      process.env.JOVO_CLI_COLOR === 'false' && !process.env.NO_COLOR && process.env.TERM === 'dumb'
    );
  }

  /**
   * Log a output to a provided stream output
   * TODO: Log to file.
   */
  private static log(
    output: Output,
    options: LogOptions,
    stream: NodeJS.WritableStream = process.stdout,
  ): string | undefined {
    if (!this.isLogLevel(options.logLevel!)) {
      return undefined;
    }

    // Pretty print boolean values in orange
    if (typeof output === 'boolean') {
      output = chalk.hex('#ff8c00')(`${output}`);
    }

    if (typeof output === 'object') {
      output = inspect(output, { colors: true });
    }

    const formattedOutput: string[] = [`${output}`];

    if (options.indent) {
      formattedOutput.unshift(' '.repeat(options.indent));
      formattedOutput[formattedOutput.length - 1] = formattedOutput[
        formattedOutput.length - 1
      ].replace(/\n/g, `\n${' '.repeat(options.indent)}`);
    }

    if (options.prefix) {
      formattedOutput.unshift(options.prefix, ' ');
      formattedOutput[formattedOutput.length - 1] = formattedOutput[
        formattedOutput.length - 1
      ].replace(/\n/g, `\n${options.prefix} `);
    }

    if (options.newLine !== false) {
      formattedOutput.push('\n');
    }

    let outputString: string = formattedOutput.join('');

    if (this.isRaw()) {
      outputString = getRawString(outputString);
    }

    if (options.dry) {
      return outputString;
    }

    stream.write(outputString, 'utf-8');
  }

  /**
   * Prints out an empty line
   */
  static spacer(
    symbol: string = ' ',
    repeat: number = 80,
    options?: LogOptions,
  ): string | undefined {
    return this.log(symbol.repeat(repeat), { logLevel: LogLevel.Info, ...options });
  }

  static info<OPTIONS extends LogOptions>(output: Output, options?: OPTIONS): LogOutput<OPTIONS> {
    return this.log(output, { logLevel: LogLevel.Info, ...options }) as LogOutput<OPTIONS>;
  }

  static warning<OPTIONS extends LogOptions>(
    output: Output,
    options?: OPTIONS,
  ): LogOutput<OPTIONS> {
    return this.log(
      output,
      {
        logLevel: LogLevel.Warn,
        prefix: WARNING,
        ...options,
      },
      process.stderr,
    ) as LogOutput<OPTIONS>;
  }

  static error<OPTIONS extends LogOptions>(
    error: Error | Output,
    options?: OPTIONS,
  ): LogOutput<OPTIONS> {
    return this.log(
      chalk.redBright(error),
      {
        logLevel: LogLevel.Error,
        prefix: ERROR,
        ...options,
      },
      process.stderr,
    ) as LogOutput<OPTIONS>;
  }

  static debug<OPTIONS extends LogOptions>(output: Output, options?: OPTIONS): LogOutput<OPTIONS> {
    return this.log(output, { logLevel: LogLevel.Debug, ...options }) as LogOutput<OPTIONS>;
  }

  static verbose<OPTIONS extends LogOptions>(
    output: Output,
    options?: OPTIONS,
  ): LogOutput<OPTIONS> {
    return this.log(output, {
      logLevel: LogLevel.Verbose,
      prefix: chalk.bgMagenta.white('DEBUG'),
      ...options,
    }) as LogOutput<OPTIONS>;
  }
}
