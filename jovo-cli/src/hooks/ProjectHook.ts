import { getProject } from 'jovo-cli-core';

const project = getProject();
const projectLevelCommands = [
  'build',
  'convert',
  'deploy',
  'get',
  'init',
  'run',
  'scaffold',
  'update',
];
const versionArgs = ['-v', '-V', '--version', 'version'];

export default async function hook() {
  if (
    projectLevelCommands.indexOf(process.argv[2]) !== -1 &&
    versionArgs.indexOf(process.argv[2]) === -1
  ) {
    if (!(await project.isInProjectDirectory()) && process.argv.indexOf('--help') === -1) {
      console.error(
        '\nTo use this command, please go into the directory of a valid Jovo project.\n',
      );
      process.exit(1);
    }
  }
}
