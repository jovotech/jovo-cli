import { spawn, spawnSync, SpawnSyncReturns } from 'child_process';
import { mkdirSync } from 'fs';
import { deleteFolderRecursive } from 'jovo-cli-core';
import { join as joinPaths } from 'path';
import rimraf from 'rimraf';
import * as cli from 'cli';

const testDir: string = 'tmpTestFolderBuild';

beforeAll(() => {
  rimraf.sync(testDir);
  mkdirSync(testDir);
});

describe('jovo build', () => {
  test('jovo build', () => {
    // Create new Jovo project.
    const projectName: string = 'helloworld-default';
    const projectDir: string = joinPaths(testDir, projectName);
    spawnSync('jovo', ['new', '-t', 'helloworldtest', '--skip-npminstall', projectName], {
      cwd: testDir,
    });

    jovo('build', [], projectDir);
  });
});

function jovo(command: string, parameters: string[], cwd: string) {
  try {
    const child: SpawnSyncReturns<Buffer> = spawnSync(
      joinPaths(process.cwd(), 'bin/run'),
      [command, ...parameters],
      { cwd },
    );
    console.log(child);
  } catch (err) {
    console.log(err);
    process.exit();
  }
}
