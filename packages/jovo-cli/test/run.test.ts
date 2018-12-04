import * as childProcess from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { deleteFolderRecursive } from '../utils/Utils';

const execFile = promisify(childProcess.execFile);
const spawn = childProcess.spawn;

const tmpTestfolder = 'tmpTestfolderRun';


describe('run v1', () => {
	const projectName = 'helloworldRun_v1';

	beforeAll(async () => {
		deleteFolderRecursive(tmpTestfolder);
		if (!fs.existsSync(tmpTestfolder)) {
			fs.mkdirSync(tmpTestfolder);
		}

		const { stdout, stderr } = await execFile('node',
			[
				'./../dist/index.js',
				'new', projectName,
				'-t', 'helloworldtest',
				'--v1'
			], {
					cwd: tmpTestfolder
			}
		);

		if (stderr) {
			return Promise.reject(new Error(stderr));
		}

		if (stdout.indexOf('Installation completed.') === -1) {
			return Promise.reject(new Error(`Expected \'Installation completed.\' but found ''${stdout}''`));
		}

	}, 25000);


	it('jovo run', (done) => {
		const projectFolder = path.join(tmpTestfolder, projectName);
		const child = spawn('node', ['./../../dist/index.js',
			'run'], {
				cwd: projectFolder,
			});

		let fullData = '';
		child.stdout.on('data', (data) => {
			fullData += data.toString();
		});
		child.stderr.on('data', (data) => {
			console.error(data.toString());
			done();
		});

		setTimeout(() => {
			expect(fullData).toContain('Example server listening on port 3000!');
			child.kill();
			done();
		}, 8000);
	}, 200000);


	it('jovo run --bst-proxy', (done) => {
        const projectFolder = path.join(tmpTestfolder, projectName);
		const child = spawn('node', ['./../../dist/index.js',
            'run',
            '--bst-proxy'], {
            cwd: projectFolder,
		});

        let fullData = '';
        child.stdout.on('data', (data) => {
            fullData += data.toString();
        });
		child.stderr.on('data', (data) => {
			console.error(data.toString());
			done();
		});

        setTimeout(() => {
            const validation =
                // If proxy has already being run a configuration exists
                fullData.indexOf('Example server listening on port 3000!') > -1 ||
                // If proxy haven't run, one is created
                fullData.indexOf('info: CONFIG      No configuration. Creating one') > -1;
			expect(validation).toBe(true);
            child.kill();
			done();
        }, 8000);
	}, 200000);


	it('jovo run --webhook-standalone', (done) => {
		const projectFolder = path.join(tmpTestfolder, projectName);

		const child = spawn('node', ['./../../dist/index.js',
            'run',
            '--webhook-standalone'], {
            cwd: projectFolder,
        });
        let fullData = '';
        child.stdout.on('data', (data) => {
            fullData += data.toString();
        });
		child.stderr.on('data', (data) => {
			console.error(data.toString());
			done();
		});
        setTimeout(() => {
			expect(fullData).toContain('Example server listening on port 3000!');
            child.kill();
			done();
        }, 18000);
	}, 200000);

});



describe('run v2', () => {
	const projectName = 'helloworldRun_v2';

	beforeAll(async () => {
		deleteFolderRecursive(tmpTestfolder);
		if (!fs.existsSync(tmpTestfolder)) {
			fs.mkdirSync(tmpTestfolder);
		}

		const { stdout, stderr } = await execFile('node',
			[
				'./../dist/index.js',
				'new', projectName,
				'-t', 'helloworldtest'
			], {
				cwd: tmpTestfolder
			}
		);

		if (stderr) {
			return Promise.reject(new Error(stderr));
		}

		if (stdout.indexOf('Installation completed.') === -1) {
			return Promise.reject(new Error(`Expected \'Installation completed.\' but found ''${stdout}''`));
		}

	}, 25000);


	it('jovo run', (done) => {
		const projectFolder = path.join(tmpTestfolder, projectName);
		const child = spawn('node', ['./../../dist/index.js',
			'run'], {
				cwd: projectFolder,
			});

		let fullData = '';
		child.stdout.on('data', (data) => {
			fullData += data.toString();
		});
		child.stderr.on('data', (data) => {
			console.error(data.toString());
			done();
		});

		setTimeout(() => {
			expect(fullData).toContain('Local server listening on port 3000.');
			child.kill();
			done();
		}, 8000);
	}, 200000);


	it('jovo run --bst-proxy', (done) => {
		const projectFolder = path.join(tmpTestfolder, projectName);
		const child = spawn('node', ['./../../dist/index.js',
			'run',
			'--bst-proxy'], {
				cwd: projectFolder,
			});

		let fullData = '';
		child.stdout.on('data', (data) => {
			fullData += data.toString();
		});
		child.stderr.on('data', (data) => {
			console.error(data.toString());
			done();
		});

		setTimeout(() => {
			const validation =
				// If proxy has already being run a configuration exists
				fullData.indexOf('Local server listening on port 3000.') > -1 ||
				// If proxy haven't run, one is created
				fullData.indexOf('info: CONFIG      No configuration. Creating one') > -1;
			expect(validation).toBe(true);
			child.kill();
			done();
		}, 8000);
	}, 200000);


	it('jovo run --webhook-standalone', (done) => {
		const projectFolder = path.join(tmpTestfolder, projectName);

		const child = spawn('node', ['./../../dist/index.js',
			'run',
			'--webhook-standalone'], {
				cwd: projectFolder,
			});
		let fullData = '';
		child.stdout.on('data', (data) => {
			fullData += data.toString();
		});
		child.stderr.on('data', (data) => {
			console.error(data.toString());
			done();
		});
		setTimeout(() => {
			expect(fullData).toContain('Local server listening on port 3000.');
			child.kill();
			done();
		}, 18000);
	}, 200000);

});


afterAll((done) => {
	setTimeout(() => {
        deleteFolderRecursive(tmpTestfolder);
        done();
    }, 2000);
}, 5000);
