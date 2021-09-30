import * as chalk from 'chalk';
import * as fs from 'fs';
import { sep as pathSep } from 'path';
import stripAnsi from 'strip-ansi';

export function log(msg: undefined | string | object) {
  let data = '';
  try {
    data = fs.readFileSync('debug.log', 'utf8');
  } catch (e) {}

  if (typeof msg !== 'string') {
    msg = JSON.stringify(msg, null, '\t');
  }

  data += '\n' + msg;
  fs.writeFileSync('debug.log', data);
}

export function getUserHome(): string {
  let envVariable = 'HOME';
  if (process.platform === 'win32') {
    envVariable = 'USERPROFILE';
  }

  if (process.env[envVariable] === undefined) {
    return pathSep;
  }

  return process.env[envVariable] as string;
}

/**
 * Timeout promise
 * @param {Number} ms
 * @return {Promise<any>}
 */
export function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, ms);
  });
}

/**
 * Print stage helper
 * @param {string} stage
 * @return {string}
 */
export function printStage(stage: undefined | string) {
  return stage ? `(stage: ${chalk.white.bold(stage)})` : ``;
}

export function printWarning(message: string) {
  return chalk.yellow.bold(`[WARN] ${message}`);
}

/**
 * Strips ANSI escape codes from the provided string.
 * @param output - String potentially containing ANSI escape codes to be stripped.
 */
export function getRawString(output: string): string {
  return stripAnsi(output);
}
