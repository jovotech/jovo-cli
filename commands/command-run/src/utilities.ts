import { Package, UserConfig } from '@jovotech/cli-core';

/**
 * Checks whether to display an update message for out-of-date packages or not.
 * Returns an array of out-of-date packages.
 */
export function shouldUpdatePackages(userConfig: UserConfig, outdatedPackages: Package[]): boolean {
  // Calculate update interval (24 hours) into ms.
  const updateInterval: number = 24 * 60 * 60 * 1000;

  // Check if it's time to update the user again.
  if (userConfig.timeLastUpdateMessage) {
    // Convert parameter into ms and add it to the time the update message was shown last.
    const nextDisplayTime = new Date(userConfig.timeLastUpdateMessage).getTime() + updateInterval;

    if (new Date().getTime() < nextDisplayTime) {
      return false;
    }
  }

  if (outdatedPackages.length) {
    // If there is at least one out-of-date package, update timeLastUpdateMessage and return true
    userConfig.timeLastUpdateMessage = new Date().toISOString();
    userConfig.save();

    return true;
  }

  return false;
}
