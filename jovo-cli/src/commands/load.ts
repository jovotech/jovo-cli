import Command from '@oclif/command';
import { copySync, existsSync, mkdirSync, moveSync, readFileSync, removeSync } from 'fs-extra';
import { getProject, JovoCliError } from 'jovo-cli-core';
import Listr = require('listr');
import { addBaseCliOptions, JovoCliRenderer, platforms } from '../utils';
import { ANSWER_BACKUP, ANSWER_OVERWRITE, promptOverwriteComponent } from '../utils/Prompts';
import chalk from 'chalk';

export class Load extends Command {
  static description =
    'Extracts the necessary files for a component from ./node_modules into your projects ./components folder.';

  static examples = ['jovo load jovo-component-get-email'];

  static args = [{ name: 'component' }];

  async run() {
    try {
      const { args } = this.parse(Load);

      const project = getProject();
      await project.init();

      if (!existsSync(`./node_modules/${args.component}`)) {
        throw new JovoCliError(
          `The component '${args.component}' does not exist.`,
          'jovo-cli',
          "Please check for spelling or install it with 'npm i ${args.component} -s'.",
        );
      }

      this.log(`\n jovo load: ${Load.description}`);
      this.log(chalk.grey('   >> Learn more: https://jovo.tech/docs/cli/load\n'));

      const dest = existsSync('./src') ? './src/components' : './components';
      const isTsProject = await project.isTypeScriptProject();

      // Overwrite existing component or back it up.
      if (existsSync(`${dest}/${args.component}`)) {
        const { overwriteComponent } = await promptOverwriteComponent();

        switch (overwriteComponent) {
          case ANSWER_OVERWRITE:
            {
              removeSync(`${dest}/${args.component}`);
            }
            break;
          case ANSWER_BACKUP:
            {
              // Remove old backup
              moveSync(
                `${dest}/${args.component}`,
                `${dest}/${args.component}.backup.${Date.now()}`,
              );
            }
            break;
          default:
            return;
        }
      }

      const tasksArr = [
        {
          title: 'Copying component files...',
          async task() {
            await new Promise((res) =>
              setTimeout(() => {
                load(args.component, dest, isTsProject);
                res();
              }, 1000),
            );
          },
        },
      ];

      const tasks = new Listr(tasksArr, {
        renderer: new JovoCliRenderer(),
        collapse: false,
      });

      await tasks.run();
      this.log();
      this.log(
        `\n\nSuccessfully copied ${args.component} into ${dest}.` +
          '\n\nLearn more on how to use it here >> https://github.com/jovotech/jovo-framework/blob/master/docs/advanced-concepts/components.md',
      );
      this.log();
    } catch (err) {
      this.error(`There was a problem:\n${err}`);
    }
  }
}

/**
 * Recursive function, loads components file into subdirectory.
 * @param component: The component to copy files from
 * @param dest: Destination path to copy component files into
 * @param isTsProject: A flag for indicating a project written in Ts or Js
 */
function load(component: string, dest: string, isTsProject: boolean) {
  const src = `node_modules/${component}`;
  // Check if current component is written in Typescript
  const isTsComponent = isTypeScriptComponent(src);

  // If the destination path does not exist, create it
  if (!existsSync(dest)) {
    mkdirSync(dest);
  }

  // Determine which files to exlude in the copy process
  const invalidFiles: string[] = [];
  if (isTsProject) {
    invalidFiles.push('dist');
  } else {
    if (isTsComponent) {
      invalidFiles.push('index.ts', 'src', 'tsconfig.json');
    }
  }

  // Copy all valid component files into destination path
  copySync(`./${src}`, `${dest}/${component}`, {
    filter(file: string) {
      // If the current file is invalid, don't include it in the copy process
      return !invalidFiles.includes(file.replace(`${src}/`, ''));
    },
  });

  // Copy compiled files if necessary
  if (!isTsProject && isTsComponent) {
    copySync(`./${src}/dist`, `${dest}/${component}`, {
      filter(file: string) {
        // Exclude .d.ts and .js.map files
        return !/.*(\.d\.ts)|.*(\.js\.map)/g.test(file);
      },
    });
    removeSync(`${dest}/${component}/dist`);
  }

  // Analyse package.json for nested component
  const { devDependencies = {}, dependencies = {} } = JSON.parse(
    readFileSync(`${src}/package.json`, { encoding: 'utf-8' }),
  );
  const dependencyKeys = Object.keys(dependencies).concat(Object.keys(devDependencies));

  // If a nested component exists, call load recursively for said component
  for (const dependencyKey of dependencyKeys) {
    if (!dependencyKey.includes('jovo-component')) {
      continue;
    }

    // Throw an error, if the nested component somehow does not exist in node_modules
    if (!existsSync(`./node_modules/${dependencyKey}`)) {
      throw new JovoCliError(
        `The component ${component} depends on the nested component ${dependencyKey}, which does not exist in ./node_modules.`,
        'jovo-cli',
        `Please install it with npm i ${dependencyKey} -s and reload your component.`,
      );
    }

    // Call load recursively
    const nestedDest = existsSync(`${dest}/${component}/src`)
      ? `${dest}/${component}/src/components`
      : `${dest}/${component}/components`;
    load(dependencyKey, nestedDest, isTsProject);
  }

  // Finally delete component's package.json
  removeSync(`${dest}/${component}/package.json`);
}

function isTypeScriptComponent(componentSrc: string): boolean {
  const content = readFileSync(`${componentSrc}/package.json`, {
    encoding: 'utf-8',
  });

  if (content) {
    const packageFile = JSON.parse(content);
    if (
      packageFile.hasOwnProperty('devDependencies') &&
      packageFile.devDependencies.hasOwnProperty('typescript')
    ) {
      return true;
    }
  }

  return false;
}
