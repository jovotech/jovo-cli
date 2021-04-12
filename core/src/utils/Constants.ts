import * as os from 'os';
import { get } from 'node-emoji';
import chalk from 'chalk';

export const DEFAULT_LOCALE: string = 'en';
export const JOVO_WEBHOOK_URL: string = 'https://webhook.jovo.cloud';
export const ENDPOINTS: string[] = ['jovo-webhook', 'ngrok', 'none'];
export const REPO_URL: string = 'https://www.jovo.tech/repo/sample-apps';

// ####### PROMPT ANSWERS #######
export const ANSWER_OVERWRITE: string = 'overwrite';
export const ANSWER_CANCEL: string = 'cancel';
export const ANSWER_BACKUP: string = 'backup';

// ####### EMOJIS #######
// Check if current shell supports emoji. On Windows, this is only the case for Windows Terminal.
const SUPPORTS_EMOJI: boolean = os.platform() === 'win32' ? !!process.env.WT_SESSION : true;

export const OK_HAND: string = SUPPORTS_EMOJI ? get('ok_hand') : '';
export const TADA: string = SUPPORTS_EMOJI ? get('tada') : '';
export const STAR: string = SUPPORTS_EMOJI ? get('star') : '';
export const STATION: string = SUPPORTS_EMOJI ? get('station') : '';
export const CLOUD: string = SUPPORTS_EMOJI ? get('cloud') : '';
export const CRYSTAL_BALL: string = SUPPORTS_EMOJI ? get('crystal_ball') : '';
export const WRENCH: string = SUPPORTS_EMOJI ? get('wrench') : '';
export const ROCKET: string = SUPPORTS_EMOJI ? get('rocket') : '';
export const WARNING: string = SUPPORTS_EMOJI ? get('warning') : chalk.yellow('[WARN]');
export const ERROR: string = SUPPORTS_EMOJI ? get('x') : chalk.bgRed('[ERR]');
export const SPARKLES: string = SUPPORTS_EMOJI ? get('sparkles') : '';
export const REVERSE_ARROWS: string = SUPPORTS_EMOJI ? get('leftwards_arrow_with_hook:') : '';

// ####### TARGETS #######
export const TARGET_ALL: string = 'all';
export const TARGET_ZIP: string = 'zip';
export const TARGET_INFO: string = 'info';
export const TARGET_MODEL: string = 'model';
