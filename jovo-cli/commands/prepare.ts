import * as Listr from 'listr';
import * as Vorpal from 'vorpal';
import { join as pathJoin } from 'path';
import { existsSync, mkdirSync, copySync, removeSync, readFileSync } from 'fs-extra';
import { addBaseCliOptions } from '../utils/Utils';
import { getProject } from 'jovo-cli-core';
import { JovoCliRenderer } from '../utils/JovoRenderer';
import { ListrOptionsExtended } from '../src';

const project = getProject();

module.exports = (vorpal: Vorpal) => {
    const vorpalInstance = vorpal
        .command('prepare <component>')
        // @ts-ignore
        .description('Extracts the necessary files for a component from ./node_modules into your projects ./components folder.');

    addBaseCliOptions(vorpalInstance);

    vorpalInstance
        .validate((args: Vorpal.Args) => {
            return componentExists(args.component);
        })
        .action(async (args: Vorpal.Args) => {
            const component = args.component;
            const src = `node_modules/${component}/`;
            let dest = '';
            if (existsSync('./src')) {
                if (!existsSync('./src/components')) {
                    mkdirSync('./src/components');
                }
                dest = './src/components';
            } else {
                if (!existsSync('./components')) {
                    mkdirSync('./components');
                }
                dest = './components';
            }

            const isTsProject = await project.isTypeScriptProject();
            const isTsComponent = isTypeScriptComponent(src);

            const options = {
                filter(s: string) {
                    const invalidFiles = ['package.json'];
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

                    return !invalidFiles.includes(s.replace(src, ''));
                }
            };

            const tasksArr: { title: string, task: Function }[] = [
                {
                    title: 'Copying Component Files',
                    async task() {
                        await new Promise((res) => setTimeout(
                            () => {
                                copySync(`./${src}`, `${dest}/${component}`, options);
                                res();
                            },
                            1000
                        ));
                    }
                }
            ];

            if (!isTsProject && isTsComponent) {
                tasksArr.push({
                    title: 'Preparing Component for Javascript Project',
                    async task() {
                        await new Promise((res) => setTimeout(
                            () => {
                                copySync(`./${src}dist`, `${dest}/${component}`, {
                                    filter(s: string) {
                                        // Exclude .d.ts and .js.map files
                                        return !/.*(\.d\.ts)|.*(\.js\.map)/g.test(s.replace(src, ''));
                                    }
                                });
                                removeSync(`${dest}/${component}/dist`);
                                res();
                            },
                            750
                        ));
                    }
                });
            }

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
                process.exit(1);
            }
        });
};

function componentExists(component: string) {
    if (!existsSync(`./node_modules/${component}`)) {
        console.log(`The component '${component}' does not exist. Please check for spelling or install it with 'npm i ${component} -s'.`);
        return false;
    }
    return true;
}

function isTypeScriptComponent(componentSrc: string): boolean {
    const packagePath = pathJoin(componentSrc, 'package.json');
    const content = readFileSync(packagePath, { encoding: 'utf-8' });
    if (!content) {
        return false;
    }
    const packageFile = JSON.parse(content);

    if (packageFile.hasOwnProperty('devDependencies') && packageFile.devDependencies.hasOwnProperty('typescript')) {
        return true;
    }

    return false;
} 