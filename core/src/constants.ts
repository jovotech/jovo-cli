import * as os from 'os';
import { get } from 'node-emoji';
import chalk from 'chalk';

export const DEFAULT_LOCALE = 'en';
export const JOVO_WEBHOOK_URL = 'https://webhook.jovo.cloud';
export const REPO_URL = 'https://www.jovo.tech/repo/sample-apps';
export const SUPPORTED_LANGUAGES = ['typescript', 'javascript'] as const;

// ####### PROMPT ANSWERS #######
export const ANSWER_OVERWRITE = 'overwrite';
export const ANSWER_UPDATE = 'update';
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
export const WARNING: string = chalk.yellow('WARN');
export const SUCCESS: string = SUPPORTS_EMOJI ? chalk.green('✔') : chalk.green('√');
export const ERROR: string = chalk.red('x');
export const ERROR_PREFIX: string = chalk.red('›');
export const SPARKLES: string = SUPPORTS_EMOJI ? get('sparkles') : '';
export const REVERSE_ARROWS: string = SUPPORTS_EMOJI ? get('leftwards_arrow_with_hook:') : '';
export const ARROW_UP: string = SUPPORTS_EMOJI ? get('arrow_up') : '';
export const PACKAGE: string = SUPPORTS_EMOJI ? get('package') : '';
export const DOWNLOAD: string = SUPPORTS_EMOJI ? get('inbox_tray') : '';
export const MAGNIFYING_GLASS: string = SUPPORTS_EMOJI ? get('mag') : '';
export const DISK: string = SUPPORTS_EMOJI ? get('floppy_disk') : '';
export const CONSTRUCTION: string = SUPPORTS_EMOJI ? get('construction') : '';
