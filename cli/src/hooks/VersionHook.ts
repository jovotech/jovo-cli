import { Hook } from '@oclif/config';
import { chalk, getPackageVersions, JovoCli, PackageVersions, Log } from '@jovotech/cli-core';
import latestVersion from 'latest-version';
import envinfo from 'envinfo';

const hook: Hook<'init'> = async function () {
  if (!['-v', '-V', '--version', 'version'].includes(process.argv[2])) {
    return;
  }

  const packageJson = require('../../package');
  const current: string = packageJson.version;
  const latest: string = await latestVersion(packageJson.name);

  Log.spacer();
  Log.info(
    `${packageJson.name}: ${current} ${
      current !== latest ? `(update to ${chalk.green(latest)} available)` : ''
    }`,
  );

  // Check for versions of Jovo modules within a project
  const cli: JovoCli = JovoCli.getInstance();
  if (cli.isInProjectDirectory()) {
    const versions: PackageVersions = await getPackageVersions(/^@jovotech/, cli.projectPath);
    if (Object.keys(versions).length) {
      const output: string[] = [];
      let updatesAvailable: boolean = false;
      for (const [packageName, version] of Object.entries(versions)) {
        let versionOutput: string = `  - ${packageName}: ${version.local}`;
        if (version.npm !== version.local) {
          updatesAvailable = true;
          versionOutput += chalk.green(` -> ${version.npm}`);
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

  // Log environment info, such as operating system
  const env = await envinfo.run({
    System: ['OS'],
    Binaries: ['Node', 'npm', 'jovov4'],
  });

  Log.spacer();
  Log.info('Environment:');
  Log.info(env.replace('\n', ''));

  process.exit();
};

export default hook;
