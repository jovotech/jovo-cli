import { prompt } from 'prompts';

/**
 * Prompts for the platform to use.
 * @param message - Custom message to use in prompt.
 * @param platforms - List of available platforms to select from.
 */
export async function promptForPlatform(platforms: string[]): Promise<{ platform: string }> {
  return await prompt({
    name: 'platform',
    type: 'select',
    message: 'Please select the platform you want to reverse build from:',
    choices: platforms.map((platform) => {
      return { title: platform, value: platform };
    }),
  });
}
