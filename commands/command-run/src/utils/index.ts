import { ChildProcess } from 'child_process';
import open from 'open';
import {
  CLOUD,
  execAsync,
  getPackageVersions,
  JovoCli,
  JovoCliError,
  JovoUserConfig,
  JovoUserConfigFile,
  JOVO_WEBHOOK_URL,
  PackageVersions,
  printWarning,
} from '@jovotech/cli-core';

import * as JovoWebhookConnector from './JovoWebhookConnector';

/**
 * Compile TypeScript code of Jovo project to JavaScript.
 * @param sourceFolder - Source folder.
 */
export async function compileTypeScriptProject(sourceFolder: string): Promise<void> {
  try {
    await execAsync('npm run tsc', { cwd: sourceFolder });
  } catch (error) {
    throw new JovoCliError(error.stderr, '@jovotech/cli-command-run', error.stdout);
  }
}

/**
 * Checks whether to display an update message for out-of-date packages or not.
 * Returns an array of out-of-date packages.
 */
export async function shouldUpdatePackages(
  projectPath: string,
  userConfig: JovoUserConfig,
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

/**
 * Initializes a connection to the Jovo Webhook.
 * @param options - Options for the JovoWebhookConnector.
 * @param childProcess - Optional child process to write data into.
 */
export function instantiateJovoWebhook(
  cli: JovoCli,
  options: JovoWebhookConnector.PostOptions,
  childProcess?: ChildProcess,
): void {
  const webhookId: string = cli.$userConfig.getWebhookUuid();
  // Get endpoint directly from config to skip eval() from $configReader.
  const endpointRaw: string = cli.$project!.$config.getParameter('endpoint') as string;
  // Resolve endpoint. Transforms `JOVO_WEBHOOK_URL` to actual webhook url.
  const endpoint: string = cli.resolveEndpoint(endpointRaw);

  if (endpoint && endpoint.startsWith('arn')) {
    printWarning(
      "Your configured endpoint is a lambda endpoint. Lambda isn't supported with jovo run.",
    );
  }

  // Open socket redirect from server to localhost.
  JovoWebhookConnector.open(webhookId, JOVO_WEBHOOK_URL, options);

  const debuggerUrl = `${JOVO_WEBHOOK_URL}/${webhookId}`;

  // Check if the current output is being piped to somewhere.
  if (process.stdout.isTTY) {
    // Check if we can enable raw mode for input stream to capture raw keystrokes.
    if (process.stdin.setRawMode) {
      setTimeout(() => {
        console.log(`\n${CLOUD} To open Jovo Debugger in your browser, enter .\n`);
      }, 2500);

      // Capture unprocessed key input.
      process.stdin.setRawMode(true);
      // Explicitly resume emitting data from the stream.
      process.stdin.resume();
      // Capture readable input as opposed to binary.
      process.stdin.setEncoding('utf-8');

      // Collect input text from input stream.
      let inputText = '';
      process.stdin.on('data', async (keyRaw: Buffer) => {
        const key: string = keyRaw.toString();
        // When dot gets pressed, try to open the debugger in browser.
        if (key === '.') {
          try {
            await open(debuggerUrl);
          } catch (error) {
            console.log(
              '\nCould not open browser. Please open debugger manually by visiting this url:',
            );
            console.log(debuggerUrl);
          }
          inputText = '';
        } else {
          // When anything else got pressed, record it and send it on enter into the child process.
          if (key.charCodeAt(0) === 13) {
            // Send recorded input to child process. This is useful for restarting a nodemon process with rs, for example.
            if (childProcess) {
              childProcess.stdin!.write(inputText + '\n');
            }
            process.stdout.write('\n');
            inputText = '';
          } else if (key.charCodeAt(0) === 3) {
            // Ctrl+C has been pressed, kill process.
            process.exit();
          } else {
            // Record input text and write it into terminal.
            inputText += key;
            process.stdout.write(key);
          }
        }
      });
    } else {
      setTimeout(() => {
        console.log(
          `\n${CLOUD} To open Jovo Debugger open this url in your browser:\n${debuggerUrl}\n`,
        );
      }, 2500);
    }
  }
}
