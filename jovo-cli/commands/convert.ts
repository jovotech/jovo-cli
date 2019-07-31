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
            const origin = args.options.from;
            let target = args.options.to;
            // If target does not end with "/", place a "/" to the end of it. 
            target = target ? target.replace(/\/?$/, '/') : target;

            const tasksArr: Array<{ title: string, task: Function }> = [];
            let successMsg = '';
            let failMsg = '';

            switch (args.fn) {
                case 'i18nToCsv': {
                    tasksArr.push(
                        {
                            title: 'Converting to .csv file',
                            async task(ctx: any) {    // tslint:disable-line:no-any
                                ctx.csv = await new Promise((res) => setTimeout(() => {
                                    res(toCsv(fromI18N(origin)))
                                }, 500));
                            }
                        },
                        {
                            title: 'Writing .csv file',
                            async task(ctx: any) {    // tslint:disable-line:no-any
                                await new Promise((res) => setTimeout(() => {
                                    writeFileSync(`${target || './'}responses.csv`, ctx.csv);
                                    res();
                                }, 500));
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
                                ctx.model = await new Promise((res) => setTimeout(async () => {
                                    res(toI18N(await fromCsv(origin)));
                                }, 500));
                            }
                        },
                        {
                            title: 'Writing i18n files',
                            async task(ctx: any) {    // tslint:disable-line:no-any
                                await new Promise((res) => setTimeout(() => {
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
                                    res();
                                }, 500));
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
    if (!['i18nToCsv', 'csvToI18n'].includes(fn)) {
        console.log(`The function ${fn} is not supported. Please use one of the following:`);
        console.log('\t* i18nToCsv\n\t* csvToI18n');
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

    // Since the keys are the same in every entry, it is sufficient to fetch them from the first one.
    const keys = Object.keys(model[0]);
    let csv = keys.join(',');
    for (const keyValue of model) {
        csv += `\n${Object.values(keyValue).join(',')}`;
    }

    return csv;
}

function parseI18nModel(locale: string, i18nModel: { [key: string]: any }, model: { [key: string]: string }[]): { [key: string]: string }[] {
    for (const prop in i18nModel) {
        if (!i18nModel.hasOwnProperty(prop)) {
            continue;
        }

        if (prop === 'translation') {
            for (const key in i18nModel[prop]) {
                if (!i18nModel[prop].hasOwnProperty(key)) {
                    continue;
                }

                const value = i18nModel[prop][key];
                switch (value.constructor) {
                    case Array: {
                        for (const v of value) {
                            writeToJson(locale, key, v, model);
                        }
                    } break;
                    case String: {
                        writeToJson(locale, key, value, model);
                    } break;
                    case Object: {
                        for (const k in value) {
                            writeToJson(locale, `${key}.${k}`, value[k], model);
                        }
                    }
                }
            }
        } else {
            parseI18nModel(`${locale}-${prop}`, i18nModel[prop], model);
        }
    }
    return model;
}

function writeToJson(locale: string, key: string, value: any, model: { [key: string]: string }[]) {
    // go through every entry, write an empty string there
    // save index where to write the real value
    if (value.includes(',')) {
        value = `"${value}"`;
    }

    let index;
    for (const [i, keyValue] of model.entries()) {
        if (!keyValue[locale]) {
            keyValue[locale] = '';
        }

        if (keyValue.key === key) {
            index = i;
            // Check if current locale already exists here
            if (keyValue[locale] && keyValue[locale] !== '') {
                // If so, look for another entry
                index = undefined;
                continue;
            }
        }
    }

    if (index) {
        model[index][locale] = value;
    } else {
        const obj: any = {};
        if (model[0]) {
            for (const k in model[0]) {
                if (!model[0].hasOwnProperty(k)) {
                    continue;
                }

                if (k === 'key') {
                    obj[k] = key;
                } else {
                    obj[k] = '';
                }
            }
            obj[locale] = value;
        } else {
            obj.key = key
            obj[locale] = value;
        }
        model.push(obj);
    }
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

    const model: { [key: string]: string }[] = [];   // tslint:disable-line:no-any

    for (const entry of files) {
        const i18nModel = JSON.parse(readFileSync(`${path}/${entry}`, 'utf8'));
        const locale = entry.replace('.json', '');
        parseI18nModel(locale, i18nModel, model);
    }

    // console.log(model);
    return model;
}

function toI18N(model: { [key: string]: string }[]) {
    if (!model) {
        throw new Error('Something went wrong!');
    }
    const i18n: { [key: string]: any } = {};     // tslint:disable-line:no-any

    for (const keyValue of model) {
        const { key, ...locales } = keyValue;

        for (const locale in locales) {
            if (!locales.hasOwnProperty(locale)) {
                continue;
            }

            if (!i18n[locale]) {
                i18n[locale] = {
                    translation: {}
                };
            }

            const value = keyValue[locale];
            let existingValue = i18n[locale].translation[key];

            if (!value && !existingValue) {
                continue;
            }

            if (!existingValue) {
                existingValue = value;
            } else {
                switch (existingValue.constructor) {
                    case String: {
                        existingValue = [existingValue, value];
                    } break;
                    case Array: {
                        existingValue.push(value);
                    } break;
                    default: { }
                }
            }
            i18n[locale].translation[key] = existingValue;
        }
    }

    // TODO: Platform specific stuff, replace with Tags
    for (const key in i18n) {
        if (!i18n.hasOwnProperty(key)) {
            continue;
        }

        for (const platform of ['AlexaSkill', 'GoogleAction']) {
            const locale = `${key}-${platform}`;
            if (i18n[locale]) {
                i18n[key][platform] = i18n[locale];
                delete i18n[locale];
            }
        }
    }

    return i18n;
}