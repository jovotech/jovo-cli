import * as os from 'os';
import { get } from 'node-emoji';
import chalk from 'chalk';

export const DEFAULT_LOCALE = 'en';
export const JOVO_WEBHOOK_URL = 'https://webhookv4.jovo.cloud';
export const ENDPOINTS: string[] = ['jovo-webhook', 'ngrok', 'none'];
export const REPO_URL = 'https://www.jovo.tech/repo/sample-apps';

// ####### PROMPT ANSWERS #######
export const ANSWER_OVERWRITE = 'overwrite';
export const ANSWER_CANCEL = 'cancel';
export const ANSWER_BACKUP = 'backup';

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
export const WARNING: string = chalk.yellow('!');
export const ERROR: string = chalk.red('x');
export const ERROR_PREFIX: string = chalk.red('›');
export const SPARKLES: string = SUPPORTS_EMOJI ? get('sparkles') : '';
export const REVERSE_ARROWS: string = SUPPORTS_EMOJI ? get('leftwards_arrow_with_hook:') : '';
export const PACKAGE: string = SUPPORTS_EMOJI ? get('package') : '';

// ####### TARGETS #######
export const TARGET_ALL = 'all';
export const TARGET_ZIP = 'zip';
export const TARGET_INFO = 'info';
export const TARGET_MODEL = 'model';
