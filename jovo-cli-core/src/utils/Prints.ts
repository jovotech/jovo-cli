import chalk from 'chalk';
import indentString from 'indent-string';
import { WARNING } from './Constants';

/**
 * Returns a string of a stage in white bold font.
 * @param stage - Stage to print.
 */
export function printStage(stage?: string): string {
  return stage ? `[stage: ${printHighlight(stage)}]` : '';
}

/**
 * Returns a string of a white, bold text.
 * @param text - Text to highlight.
 */
export function printHighlight(text: string) {
  return chalk.white.bold(text);
}

/**
 * Returns a string of a grey sub headline.
 * @param hl - Subheadline to print.
 */
export function printSubHeadline(hl: string): string {
  return chalk.white.dim(indentString(`>> ${hl}`, 2));
}

/**
 * Returns a string of an ASK profile in white bold font.
 * @param askProfile - ASK profile to print.
 */
export function printAskProfile(askProfile?: string): string {
  return askProfile ? `[ASK profile: ${printHighlight(askProfile)}]` : '';
}

/**
 * Prints a yellow warning output.
 * @param message - Warning message to print.
 */
export function printWarning(message: string) {
  return chalk.yellow.bold(`${WARNING} ${message}`);
}

/**
 * Prints green code snippets.
 * @param code - Code to print.
 */
export function printCode(code: string): string {
  return chalk.green(code);
}
