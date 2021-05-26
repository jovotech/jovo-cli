import { Hook } from '@oclif/config';
import { getPackageVersions, JovoCli, PackageVersions, printCode, Log } from '@jovotech/cli-core';
import latestVersion from 'latest-version';

const hook: Hook<'init'> = async function () {
  if (!['-v', '-V', '--version', 'version'].includes(process.argv[2])) {
    return;
  }

  const packageJson = require('../package');
  const current: string = packageJson.version;
  const latest: string = await latestVersion(packageJson.name);

  Log.info(
    `${packageJson.name}: ${current} ${
      current !== latest ? `(update to ${printCode(latest)} available)` : ''
    }`,
  );

  const cli: JovoCli = JovoCli.getInstance();
  if (cli.isInProjectDirectory()) {
    const versions: PackageVersions = await getPackageVersions(/^@jovotech/, cli.$projectPath);
    Log.info(versions);
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

      Log.info(output.join('\n'));
    }
  }

  Log.spacer();
  process.exit();
};

export default hook;
