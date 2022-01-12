import {
  getPackageVersions,
  JovoUserConfigFile,
  PackageVersions,
  UserConfig,
} from '@jovotech/cli-core';

/**
 * Checks whether to display an update message for out-of-date packages or not.
 * Returns an array of out-of-date packages.
 */
export async function shouldUpdatePackages(
  projectPath: string,
  userConfig: UserConfig,
): Promise<PackageVersions> {
  const jovoUserConfig: JovoUserConfigFile = userConfig.get();
  // Calculate update interval (24 hours) into ms.
  const updateInterval: number = 24 * 60 * 60 * 1000;

  // Check if it's time to update the user again.
  if (jovoUserConfig.timeLastUpdateMessage) {
    // Convert parameter into ms and add it to the time the update message was shown last.
    const nextDisplayTime =
      new Date(jovoUserConfig.timeLastUpdateMessage).getTime() + updateInterval;

    if (new Date().getTime() < nextDisplayTime) {
      return {};
    }
  }

  // Check if packages are out of date.
  const packageVersions: PackageVersions = await getPackageVersions(/^jovo\-/, projectPath);
  const outOfDatePackages: PackageVersions = {};

  for (const [key, pkg] of Object.entries(packageVersions)) {
    if (pkg.local !== pkg.npm) {
      outOfDatePackages[key] = pkg;
    }
  }

  if (Object.keys(outOfDatePackages).length) {
    // If there is at least one out-of-date package, update timeLastUpdateMessage and return true.
    jovoUserConfig.timeLastUpdateMessage = new Date().toISOString();
    userConfig.save(jovoUserConfig);
  }

  return outOfDatePackages;
}
