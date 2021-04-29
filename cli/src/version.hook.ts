import { Hook } from '@oclif/config';
import { getPackageVersions, JovoCli, PackageVersions, printCode } from '@jovotech/cli-core';
import latestVersion from 'latest-version';
import { Cli } from './JovoCli';

const hook: Hook<'init'> = async function () {
  if (!['-v', '-V', '--version', 'version'].includes(process.argv[2])) {
    return;
  }

  const packageJson = require('../package');
  const current: string = packageJson.version;
  const latest: string = await latestVersion(packageJson.name);

  console.log(
    `${packageJson.name}: ${current} ${
      current !== latest ? `(update to ${printCode(latest)} available)` : ''
    }`,
  );

  const cli: JovoCli = Cli.getInstance();
  if (cli.isInProjectDirectory()) {
    const versions: PackageVersions = await getPackageVersions(/^@jovotech/, cli.$projectPath);
    if (Object.keys(versions).length) {
      const output: string[] = [];
      let updatesAvailable: boolean = false;
      for (const [packageName, version] of Object.entries(versions)) {
        let versionOutput: string = `  - ${packageName}: ${version.local}`;
        if (version.npm !== version.local) {
          updatesAvailable = true;
          versionOutput += printCode(` -> ${version.npm}`);
        }
        output.push(versionOutput);
      }

      output.unshift(
        `\nJovo packages of the current project ${updatesAvailable ? '(updates available)' : ''}:`,
      );
      if (updatesAvailable) {
        output.push('\nUse "jovo update" to get the newest versions.');
      }

      console.log(output.join('\n'));
    }
  }

  console.log();
  process.exit();
};

export default hook;
