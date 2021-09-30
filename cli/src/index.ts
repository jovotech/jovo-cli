import { dirname } from 'path';

process.env.JOVO_CLI_RUNTIME = 'true';
process.env.JOVO_CLI_EXEC_PATH = dirname(__dirname);

export { run } from '@oclif/command';
