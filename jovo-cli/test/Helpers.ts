import * as childProcess from 'child_process';
const spawn = childProcess.spawn;
import * as path from 'path';



/**
 * Run a "jovo" command async
 *
 * @export
 * @param {string} command The jovo command
 * @param {string[]} parameters The additional parameters
 * @param {string} cwd The directory to run it in
 * @param {string} waitText The text to wait for in the output
 * @returns
 */
export async function runJovoCommand(command: string, parameters: string[], cwd: string, waitText: string) {
	parameters.unshift(command);

	// Get the script from the correct location depending on if we are in main or subfolder
	if (cwd.indexOf(path.sep) === -1) {
		parameters.unshift('../dist/index.js');
	} else {
		parameters.unshift('../../dist/index.js');
	}

	return new Promise((resolve, reject) => {
		const child = spawn('node', parameters, {
			cwd,
		});
		child.stderr.on('data', (data) => {
			reject(new Error(data.toString()));
		});
		child.stdout.on('data', (data) => {
			if (data.toString().indexOf(waitText) > -1) {
				child.kill();
				resolve(data.toString());
			}
		});
	});
}
