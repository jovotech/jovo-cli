import * as Listr from 'listr';
import * as Vorpal from 'vorpal';
import { copySync, existsSync, mkdirSync, moveSync, removeSync, readFileSync, exists } from 'fs-extra';
import { addBaseCliOptions } from '../utils/Utils';
import { getProject } from 'jovo-cli-core';
import { JovoCliRenderer } from '../utils/JovoRenderer';
import { promptOverwriteComponent, ANSWER_OVERWRITE, ANSWER_BACKUP, ANSWER_CANCEL } from '../utils/Prompts';
import { ListrOptionsExtended } from '../src';

const project = getProject();

module.exports = (vorpal: Vorpal) => {
    const vorpalInstance = vorpal
        .command('load <component>')
        // @ts-ignore
        .description('Extracts the necessary files for a component from ./node_modules into your projects ./components folder.');

    addBaseCliOptions(vorpalInstance);

    vorpalInstance
        .validate((args: Vorpal.Args) => {
            const { component } = args;
            if (!existsSync(`./node_modules/${component}`)) {
                console.log(`The component '${component}' does not exist. Please check for spelling or install it with 'npm i ${component} -s'.`);
                return false;
            }
            return true;
        })
        .action(async (args: Vorpal.Args) => {
            const { component } = args;
            const dest = existsSync('./src') ? './src/components' : './components';
            const isTsProject = await project.isTypeScriptProject();

            // Overwrite existing component or back it up
            if (existsSync(`${dest}/${component}`)) {
                const answers = await promptOverwriteComponent();

                switch (answers.overwriteComponent) {
                    case ANSWER_OVERWRITE: {
                        removeSync(`${dest}/${component}`);
                    } break;
                    case ANSWER_BACKUP: {
                        // Remove old backup
                        moveSync(`${dest}/${component}`, `${dest}/${component}.backup.${+ new Date()}`);
                    } break;
                    default: return;
                }
            }

            const tasksArr: Array<{ title: string, task: Function }> = [{
                title: 'Copying Component Files',
                async task() {
                    await new Promise((res) => setTimeout(
                        () => {
                            load(component, dest, isTsProject);
                            res();
                        },
                        1000
                    ));
                }
            }];

            // @ts-ignore
            const tasks = new Listr(tasksArr, {
                renderer: JovoCliRenderer,
                collapse: false,
            } as ListrOptionsExtended);

            try {
                await tasks.run();
                console.log(
                    `\n\nSuccessfully copied ${component} into ${dest}.` +
                    '\n\nLearn more on how to use it here >> https://github.com/jovotech/jovo-framework/blob/master/docs/advanced-concepts/components.md'
                );
            } catch (err) {
                console.log('An error occurred while loading your component. Please see the logs below.');
                console.log(err);
                process.exit(1);
            }
        });
};

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
            invalidFiles.push(
                'index.ts',
                'src',
                'tsconfig.json'
            );
        }
    }

    // Copy all valid component files into destination path
    copySync(`./${src}`, `${dest}/${component}`, {
        filter(file: string) {
            // If the current file is invalid, don't include it in the copy process
            return !invalidFiles.includes(file.replace(`${src}/`, ''));
        }
    });

    // Copy compiled files if necessary
    if (!isTsProject && isTsComponent) {
        copySync(`./${src}/dist`, `${dest}/${component}`, {
            filter(file: string) {
                // Exclude .d.ts and .js.map files
                return !/.*(\.d\.ts)|.*(\.js\.map)/g.test(file);
            }
        });
        removeSync(`${dest}/${component}/dist`);
    }

    // Analyse package.json for nested component
    const { devDependencies = {}, dependencies = {} } = JSON.parse(readFileSync(`${src}/package.json`, { encoding: 'utf-8' }));
    const dependencyKeys = Object.keys(dependencies).concat(Object.keys(devDependencies));

    // If a nested component exists, call load recursively for said component
    for (const dependencyKey of dependencyKeys) {
        if (!dependencyKey.includes('jovo-component')) {
            continue;
        }

        // Throw an error, if the nested component somehow does not exist in node_modules
        if (!existsSync(`./node_modules/${dependencyKey}`)) {
            throw new Error(`The component ${component} depends on the nested component ${dependencyKey}, which does not exist in ./node_modules. ` +
                `Please install it with npm i ${dependencyKey} -s and reload your component.`);
        }

        // Call load recursively
        const nestedDest = existsSync(`${dest}/${component}/src`) ? `${dest}/${component}/src/components` : `${dest}/${component}/components`;
        load(dependencyKey, nestedDest, isTsProject);
    }

    // Finally delete component's package.json
    removeSync(`${dest}/${component}/package.json`);
}

function isTypeScriptComponent(componentSrc: string): boolean {
    const content = readFileSync(`${componentSrc}/package.json`, { encoding: 'utf-8' });

    if (content) {
        const packageFile = JSON.parse(content);
        if (packageFile.hasOwnProperty('devDependencies') && packageFile.devDependencies.hasOwnProperty('typescript')) {
            return true;
        }
    }

    return false;
}