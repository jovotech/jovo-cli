import { UserConfig } from '@jovotech/cli-core';
import { Hook } from '@oclif/config';
import { spawn } from 'child_process';
import { readdirSync } from 'fs';
import { homedir } from 'os';
import { join as joinPaths } from 'path';

const hook: Hook<'init'> = async function ({ id, argv }) {
  const scriptsPath: string = joinPaths(homedir(), UserConfig.prototype.directory, 'scripts');
  for (const file of readdirSync(scriptsPath)) {
    if (file === id) {
      const filePath: string = joinPaths(scriptsPath, file);
      await new Promise<void>((res) => {
        const command = spawn('sh', [`${filePath}`, ...argv], { stdio: 'inherit' });

        command.on('exit', () => {
          res();
        });
      });

      process.exit();
    }
  }
};

export default hook;
