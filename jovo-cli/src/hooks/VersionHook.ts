import { getProject } from 'jovo-cli-core';
import { getPackages } from '../utils';

const project = getProject();

export default async function hook() {
  if (['-v', '-V', '--version', 'version'].includes(process.argv[2])) {
    console.log('\nJovo CLI Version: ' + require('../../package').version);

    if (await project.isInProjectDirectory()) {
      const packages = await getPackages(/^jovo\-/);
      if (Object.keys(packages).length) {
        console.log('\nJovo packages of current project:');
        for (const packageName of Object.keys(packages)) {
          console.log(`  ${packageName}: ${packages[packageName]}`);
        }
      }
    }
    console.log();
    return process.exit(0);
  }
}
