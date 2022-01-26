import { Hook } from '@oclif/config';
import {
  chalk,
  getPackageVersions,
  JovoCli,
  Package,
  Log,
  printPackages,
} from '@jovotech/cli-core';
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
    const packages: Package[] = await getPackageVersions(/^@jovotech/);
    if (packages.length) {
      const updatesAvailable: boolean = packages.some(
        (pkg) => pkg.version.npm !== pkg.version.local,
      );
      const output: string[] = [
        '',
        `Jovo packages of the current project ${updatesAvailable ? '(updates available)' : ''}:`,
        printPackages(packages),
      ];

      if (updatesAvailable) {
        output.push('\nUse "jovo update" to get the newest versions.');
      }

      Log.info(output.join('\n'));
    }
  }

  // Log environment info, such as operating system
  const env = await envinfo.run({
    System: ['OS'],
    Binaries: ['Node', 'npm', 'jovo'],
  });

  Log.spacer();
  Log.info('Environment:');
  Log.info(env.replace('\n', ''));

  process.exit();
};

export default hook;
