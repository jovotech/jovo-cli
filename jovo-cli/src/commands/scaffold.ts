import { Command, flags } from '@oclif/command';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'fs-extra';
import { getProject, JovoCliError } from 'jovo-cli-core';
import Listr = require('listr');
import { prompts, scaffolder, JovoCliRenderer } from '../utils';
import chalk from 'chalk';

const { promptOverwriteHandler, ANSWER_SEPERATE, ANSWER_CANCEL } = prompts;
const { scaffold } = scaffolder;

const srcPath = './models/';
let destPath = './src/app.js';

export class Scaffold extends Command {
  static description = 'Build a scaffold handler out of your existing language model.';

  static examples = ['jovo scaffold', 'jovo scaffold --overwrite'];

  static flags = {
    overwrite: flags.boolean({
      description: 'Forces overwriting of an existing handler file.',
    }),
  };

  async run() {
    const { flags } = this.parse(Scaffold);

    if (!isValidModel()) {
      return;
    }

    this.log(`\n jovo scaffold: ${Scaffold.description}`);
    this.log(chalk.grey('   >> Learn more: https://jovo.tech/docs/cli/scaffold\n'));

    const project = getProject();
    await project.init();

    const isTsProject = await project.isTypeScriptProject();
    if (isTsProject) {
      destPath = './src/app.ts';
    }

    if (!flags.overwrite && existsSync(destPath)) {
      const answers = await promptOverwriteHandler();
      if (answers.overwriteHandler === ANSWER_SEPERATE) {
        if (isTsProject) {
          destPath = './src/app.scaffold.ts';
        } else {
          destPath = './src/app.scaffold.js';
        }
      }

      if (answers.overwriteHandler === ANSWER_CANCEL) {
        return;
      }
    }

    const tasks = new Listr(
      [
        {
          title: `Scaffolding handler in ${destPath}...`,
          async task() {
            // Simulates longer task to play listr animation.
            await new Promise((res) => {
              setTimeout(() => {
                const models = readdirSync(srcPath);
                // Array to temporarily save all intents to counter adding an intent twice.
                const intents: string[] = [];
                // This is the basic handler, where intents get added to. Once finished, it gets written into the app.js file.
                let handler = '{\n\tLAUNCH() {\n\n\t},';
                for (const file of models) {
                  const model = JSON.parse(
                    readFileSync(`${srcPath}${file}`, { encoding: 'utf-8' }),
                  );
                  for (const { name } of model.intents) {
                    if (!intents.includes(name)) {
                      intents.push(name);
                      handler += `\n\n\t${name}() {\n\n\t},`;
                    }
                  }
                }
                handler += '\n\n\tEND() {\n\n\t},\n}';

                const model = scaffold({ handler, type: isTsProject ? 'ts' : 'js' });

                writeFileSync(destPath, model);
                res();
              }, 500);
            });
          },
        },
      ],
      {
        renderer: new JovoCliRenderer(),
        collapse: false,
      },
    );

    try {
      await tasks.run();
      this.log();
      this.log(`\n\nSuccessfully scaffolded your handler in '${destPath}'.`);
      this.log();
    } catch (err) {
      this.error(`There was a problem:\n${err}`);
    }
  }
}

function isValidModel() {
  if (existsSync(srcPath)) {
    if (readdirSync(srcPath).length > 0) {
      return true;
    }
  }
  console.log(
    `No language model available in '${srcPath}'. Please create at least one language model.`,
  );
  return false;
}
