import { get } from 'node-emoji';

export const DEFAULT_LOCALE: string = 'en';
export const JOVO_WEBHOOK_URL: string = 'https://webhook.jovo.cloud';
export const ENDPOINTS: string[] = ['jovo-webhook', 'ngrok', 'none'];
export const REPO_URL: string = 'https://www.jovo.tech/repo/sample-apps';

// ####### PROMPT ANSWERS #######
export const ANSWER_OVERWRITE: string = 'overwrite';
export const ANSWER_CANCEL: string = 'cancel';
export const ANSWER_BACKUP: string = 'backup';

// ####### EMOJIS #######
export const OK_HAND: string = get('ok_hand');
export const TADA: string = get('tada');
export const STAR: string = get('star');
export const STATION: string = get('station');
export const CLOUD: string = get('cloud');
export const CRYSTAL_BALL: string = get('crystal_ball');
export const WRENCH: string = get('wrench');

// ####### TARGETS #######
export const TARGET_ALL = 'all';
export const TARGET_ZIP = 'zip';
export const TARGET_INFO = 'info';
export const TARGET_MODEL = 'model';