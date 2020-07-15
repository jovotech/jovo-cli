import * as fs from 'fs';
import { sep as pathSep } from 'path';
const highlight = require('chalk').white.bold;

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
  return stage ? `(stage: ${highlight(stage)})` : ``;
}
