import { dirname } from 'path';

process.env.FORCE_COLOR = '1';
process.env.JOVO_CLI_RUNTIME = '1';
process.env.JOVO_CLI_EXEC_PATH = dirname(__dirname);

export { run } from '@oclif/command';
