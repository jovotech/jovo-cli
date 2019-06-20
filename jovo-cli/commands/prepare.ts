import * as Vorpal from 'vorpal';
import { existsSync, mkdirSync, copySync, readFileSync, removeSync } from 'fs-extra';
import { addBaseCliOptions } from '../utils/Utils';
import { getProject } from 'jovo-cli-core';
import { join as pathJoin } from 'path';

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
            const src = `node_module/${component}/`;
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
                    const invalidFiles = ['README.md', 'LICENSE'];
                    if (isTsProject) {
                        invalidFiles.push('dist');
                    } else {
                        // JS Project
                        if (isTsComponent) {
                            invalidFiles.push('index.ts', 'src');
                        }
                    }

                    return !invalidFiles.includes(s.replace(src, ''));
                }
            };

            copySync(`./${src}`, `${dest}/${component}`, options);
            if (!isTsProject && isTsComponent) {
                const o = {
                    filter(s: string) {
                        return !/.*(\.d\.ts)|.*(\.js\.map)/g.test(s.replace(src, ''));
                    }
                }
                copySync(`./${src}dist`, `${dest}/${component}`, o);
                removeSync(`${dest}/${component}/dist`);
            }
        });
};

function componentExists(component: string) {
    if (!existsSync(`./node_module/${component}`)) {
        console.log(`The component '${component}' does not exists. Please check for spelling or install it with 'npm i ${component} -S'.`);
        return false;
    }
    return true;
}

function isTypeScriptComponent(componentSrc: string): boolean {
    const packagePath = pathJoin(componentSrc, 'package.json');
    const content = readFileSync(packagePath, { encoding: 'utf-8' });
    const packageFile = JSON.parse(content);

    if (packageFile.hasOwnProperty('devDependencies') && packageFile.devDependencies.hasOwnProperty('typescript')) {
        return true;
    }

    return false;
}