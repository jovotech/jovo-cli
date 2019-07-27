import * as Listr from 'listr';
import * as Vorpal from 'vorpal';
import * as csvToJson from 'csvtojson';
import { addBaseCliOptions } from '../utils/Utils';
import { readFileSync, readdirSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { JovoCliRenderer } from '../utils/JovoRenderer';
import { ListrOptionsExtended } from '../src';

module.exports = (vorpal: Vorpal) => {
    const vorpalInstance = vorpal
        .command('convert <fn>')
        // @ts-ignore
        .description('Converts .csv-files to i18n.json-files and vice versa.')
        .option('--from <from>')
        .option('--to <to>');

    addBaseCliOptions(vorpalInstance);

    vorpalInstance
        .validate((args: Vorpal.Args) => {
            return isValidFunction(args.fn) && isValidOrigin(args.options.from);
        })
        .action(async (args: Vorpal.Args) => {
            /**
             * All functions are based on a unified form like this:
             *  {
             *      'en-US': {
             *          key: 'value',
             *          key_arr: ['value1', 'value2']
             *      },
             *      'de-DE': {
             *          key: 'wert'
             *      }
             *  }
             */
            const origin = args.options.from;
            let target = args.options.to;
            target = target ? target.replace(/\/?$/, '/') : target;

            const tasksArr: Array<{ title: string, task: Function }> = [];
            let successMsg = '';
            let failMsg = '';

            switch (args.fn) {
                case 'i18nToCsv': {
                    tasksArr.push(
                        {
                            title: 'Converting to .csv file',
                            task(ctx: any) {    // tslint:disable-line:no-any
                                // ctx.csv = toCsv(fromI18N(origin));
                            }
                        },
                        {
                            title: 'Writing .csv file',
                            task(ctx: any) {    // tslint:disable-line:no-any
                                writeFileSync(`${target || './'}responses.csv`, ctx.csv);
                            }
                        }
                    );
                    successMsg = 'Successfully converted I18n to Csv.';
                    failMsg = 'Something went wrong while converting from I18N. Check the logs below:\n';
                } break;
                case 'csvToI18n': {
                    tasksArr.push(
                        {
                            title: 'Converting to i18n files',
                            async task(ctx: any) {    // tslint:disable-line:no-any
                                ctx.model = toI18N(await fromCsv(origin));
                            }
                        },
                        {
                            title: 'Writing i18n files',
                            task(ctx: any) {    // tslint:disable-line:no-any
                                const model = ctx.model;
                                for (const locale in model) {
                                    if (!model.hasOwnProperty(locale)) {
                                        continue;
                                    }

                                    const dest = target || './i18n/';
                                    if (!existsSync(dest)) {
                                        mkdirSync(dest);
                                    }
                                    writeFileSync(`${dest}${locale}.json`, JSON.stringify(model[locale], null, '\t'));
                                }
                            }
                        }
                    );
                    successMsg = 'Successfully converted Csv to I18n.';
                    failMsg = 'Something went wrong while converting from Csv. Check the logs below:\n';
                } break;
                default: { }
            }

            // @ts-ignore
            const tasks = new Listr(tasksArr, {
                renderer: JovoCliRenderer,
                collapse: false,
            } as ListrOptionsExtended);

            try {
                await tasks.run();
                console.log(`\n\n${successMsg}`);
            } catch (err) {
                console.log(`\n\n${failMsg}`);
                console.log(err);
            }
        });
};

function isValidFunction(fn: string) {
    if (['i18nToCsv', 'csvToI18n'].indexOf(fn) === -1) {
        console.log(`The function ${fn} is not supported. Please use one of the following:`);
        console.log('* i18nToCsv\n* csvToI18n');
        return false;
    }
    return true;
}

function isValidOrigin(origin: string) {
    if (!origin) {
        console.log('The path from your originating files has to be set.\nYou can choose between setting a single file or an entire folder.');
        return false;
    }
    return true;
}


async function fromCsv(path: string) {
    return await csvToJson().fromFile(path);
}

function toCsv(model: { [key: string]: string }[]) {    // tslint:disable-line:no-any
    if (!model) {
        throw new Error('Something went wrong!');
    }
    // const locales = Object.keys(model);

    // const obj: { [key: string]: any } = {};     // tslint:disable-line:no-any

    // for (const [i, locale] of locales.entries()) {
    //     const keys = Object.keys(model[locale]);

    //     /* 
    //     * Every row in the .csv is simulated in an object by having an array of length=locales.length filled with empty strings.
    //     * All values are set on their respective position in the array based on the current locale.
    //     * In the end each array is joined with ',', resulting in comma-seperated strings.
    //     * e.g. WELCOME,Welcome!,,Willkommen! with locales en-US, en-CA, de-DE where the value for en-CA is empty
    //     */
    //     for (const key of keys) {
    //         const value = model[locale][key] || '';
    //         switch (value.constructor) {    // tslint:disable-line:no-any
    //             case String: {
    //                 if (!obj[key]) {
    //                     obj[key] = new Array(locales.length).fill('');
    //                 }

    //                 obj[key][i] = model[locale][key];
    //             } break;
    //             case Array: {
    //                 if (!obj[key]) {
    //                     obj[key] = [];
    //                 }

    //                 // ! WORKAROUND for the case, that a key is a string in one instance and an array in another
    //                 if (obj[key].length > 0 && obj[key][0].constructor === String) {
    //                     obj[key] = [obj[key]];
    //                 }

    //                 while (obj[key].length < value.length) {
    //                     obj[key].push(new Array(locales.length).fill(''));
    //                 }

    //                 for (const [k, v] of value.entries()) {
    //                     obj[key][k][i] = v;
    //                 }
    //             } break;
    //             // If the current key is an object, merge the child keys with its parent and write their respective values into the array
    //             case Object: {
    //                 for (const k in value) {
    //                     if (!value.hasOwnProperty(k)) {
    //                         continue;
    //                     }
    //                     const v = value[k];
    //                     const newKey = `${key}.${k}`;

    //                     if (!obj[newKey]) {
    //                         obj[newKey] = new Array(locales.length).fill('');
    //                     }

    //                     obj[newKey][i] = v;
    //                 }
    //             } break;
    //             default: { }
    //         }
    //     }
    // }

    // let csv = `key,${locales.join(',')}\n`;
    // for (const key in obj) {
    //     // If the current key holds multiple arrays (the key has multiple occurrences), loop over it and write the key multiple times
    //     if (obj[key][0].constructor === Array) {
    //         for (const arr of obj[key]) {
    //             csv += `${key},${arr.join(',')}\n`;
    //         }
    //     } else {
    //         csv += `${key},${obj[key].join(',')}\n`;
    //     }
    // }

    // return csv;
}

function fromI18N(path: string) {
    let files: string[] = [];

    // Workaround for single files
    if (path.indexOf('.json', path.length - 5) !== -1) {
        const pathArr = path.split('/');
        files.push(pathArr.pop()!);
        path = pathArr.join('/');
    } else {
        files = readdirSync(path);
    }

    const model: { [key: string]: any } = {};   // tslint:disable-line:no-any
    // For each i18n file, cut out the 'translation' part and push all the keys and their respective values onto the returned model
    files.forEach((locale) => {
        const i18nModel = JSON.parse(readFileSync(`${path}/${locale}`, 'utf8'));
        for (const prop in i18nModel) {
            if (!i18nModel.hasOwnProperty(prop)) {
                continue;
            }

            let obj = i18nModel[prop];
            if (prop !== 'translation') {
                obj = i18nModel[prop]['translation'];
                model[`${locale.replace('.json', '')}-${prop}`] = obj;
            } else {
                model[locale.replace('.json', '')] = obj;
            }
        }
    });
    return model;
}

function toI18N(model: { [key: string]: string }[]) {
    if (!model) {
        throw new Error('Something went wrong!');
    }
    const obj: { [key: string]: any } = {};     // tslint:disable-line:no-any

    for (const keyValue of model) {
        const { key, ...locales } = keyValue;

        for (const locale in locales) {
            if (!locales.hasOwnProperty(locale)) {
                continue;
            }

            if (!obj[locale]) {
                obj[locale] = {
                    translation: {}
                };
            }

            let existingValue = obj[locale].translation[key];
            if (!existingValue) {
                existingValue = keyValue[locale];
            } else {
                switch (existingValue.constructor) {
                    case String: {
                        existingValue = [existingValue, keyValue[locale]];
                    } break;
                    case Array: {
                        existingValue.push(keyValue[locale]);
                    }
                }
            }
            obj[locale].translation[key] = existingValue;
            
            let keyToPushOn = `${locale}.translation`;
        }
    }

    // return i18n;


    // // For each locale, push the keys and their respective values onto a new object with a new attribute 'translation' as parent
    // for (const locale in model) {
    //     if (!model.hasOwnProperty(locale)) {
    //         continue;
    //     }

    //     const obj: { [key: string]: any } = {       // tslint:disable-line:no-any
    //         translation: model[locale]
    //     };

    //     // If the model includes any platform-specific locales, push them onto the current locale and delete them from the model
    //     for (const platform of ['AlexaSkill', 'GoogleAction']) {
    //         const key = `${locale}-${platform}`;
    //         if (model[key]) {
    //             obj[platform] = {
    //                 translation: model[key]
    //             };
    //             delete model[key];
    //         }
    //     }

    //     i18n[locale] = obj;
    // }
    // return i18n;
}