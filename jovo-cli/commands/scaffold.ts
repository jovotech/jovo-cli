import * as Listr from 'listr';
import * as Vorpal from 'vorpal';
import * as csvToJson from 'csvtojson';
import { addBaseCliOptions } from '../utils/Utils';
import { readFileSync, readdirSync, writeFileSync, existsSync, mkdirSync, exists } from 'fs';
import { JovoCliRenderer } from '../utils/JovoRenderer';
import { ListrOptionsExtended } from '../src';

const modelPath = './models/';

module.exports = (vorpal: Vorpal) => {
    const vorpalInstance = vorpal
        .command('scaffold')
        // @ts-ignore
        .description('Build a scaffold handler out of your existing language model.');

    addBaseCliOptions(vorpalInstance);

    vorpalInstance
        .validate(() => {
            return isValidModel() && isValidHandler();
        })
        .action(async () => {
        
            const scaffold = () => {
                const models = readdirSync(modelPath);
                // Array to temporarily save all intents to counter adding an intent twice.
                const handler: string[] = [];

                // This is the basic handler, where intents get added to. Once finished, it gets written into the app.js file.
                let handlerString = '\'use strict\';\n\n// ------------------------------------------------------------------\n// APP INITIALIZATION\n// ------------------------------------------------------------------\n\nconst { App } = require(\'jovo-framework\');\nconst { Alexa } = require(\'jovo-platform-alexa\');\nconst { GoogleAssistant } = require(\'jovo-platform-googleassistant\');\nconst { JovoDebugger } = require(\'jovo-plugin-debugger\');\nconst { FileDb } = require(\'jovo-db-filedb\');\n\nconst app = new App();\n\napp.use(\n\tnew Alexa(),\n\tnew GoogleAssistant(),\n\tnew JovoDebugger(),\n\tnew FileDb()\n);\n\n// ------------------------------------------------------------------\n// APP LOGIC\n// ------------------------------------------------------------------\n\napp.setHandler({\n\tLAUNCH() {\n\n\t},';
                for (const file of models) {
                    const model = JSON.parse(readFileSync(`${modelPath}${file}`, { encoding: 'utf-8' }));
                    for (const { name } of model.intents) {
                        if (!handler.includes(name)) {
                            handler.push(name);
                            handlerString += `\n\n\t${name}() {\n\n\t},`;
                        }
                    }
                }
                handlerString += '\n\n\tUnhandled() {\n\n\t},\n});\n\nmodule.exports = { app };';

                writeFileSync('./src/app.js', handlerString);
            };

            const tasks = new Listr(
                [{
                    title: 'Scaffolding handler in ./src/app.js',
                    async task() {
                        await new Promise((res) => setTimeout(() => {
                            scaffold();
                            res();
                        }, 500));
                    }
                }],
                // @ts-ignore
                {
                    renderer: JovoCliRenderer,
                    collapse: false,
                } as ListrOptionsExtended
            );

            try {
                await tasks.run();
                console.log('\n\nSuccessfully scaffolded your handler in \'./src/app.js.\'');
            } catch (err) {
                process.exit(1);
            }
        });
};

function isValidModel() {
    if (existsSync(modelPath)) {
        if (readdirSync(modelPath).length > 0) {
            return true;
        }
    }
    console.log('No valid model available.');
    return false;
}

function isValidHandler() {
    if (existsSync('./src/app.js')) {
        return true;
    }
    console.log('No valid app.js available.');
    return false;
}