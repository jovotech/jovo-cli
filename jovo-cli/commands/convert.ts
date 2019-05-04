import * as Vorpal from 'vorpal';
import { addBaseCliOptions } from '../utils/Utils';
import { readFileSync, readdirSync, writeFileSync } from 'fs';

const fns: { [key: string]: any } = {   // tslint:disable-line
    tospreadsheet: {
        path: './i18n/responses.csv',
        fn: toCsv,
    },
    fromspreadsheet: {
        path: './',
        fn: fromCsv,
    },
    toairtable: toCsv,
    fromairtable: fromCsv,
    toi18n: toI18N,
    fromi18n: fromI18N
};

module.exports = (vorpal: Vorpal) => {
    const vorpalInstance = vorpal
        .command('convert')
        // @ts-ignore
        .description('Converts cms')
        .option('--from <from>')
        .option('--to <to>');

    addBaseCliOptions(vorpalInstance);

    vorpalInstance
        .validate((args: Vorpal.Args) => {
            return isValidOrigin(args.options.from) &&
                isValidTarget(args.options.to);
        })
        .action(async (args: Vorpal.Args) => {
            const origin = args.options.from;
            const target = args.options.to;

            const originPath = origin === 'i18n' ? './commands/i18n' : './commands/response.csv';
            const model = fns[`from${origin}`](originPath);
            const targetModel = fns[`to${target}`](model);


        });
};

function isValidConvertable(s: string, message: string) {
    if (['i18n', 'spreadsheet', 'airtable'].indexOf(s) === -1) {
        console.log(message);
        return false;
    }
    return true;
}

function isValidOrigin(origin: string) {
    return isValidConvertable(origin, 'Invalid origin');
}

function isValidTarget(target: string) {
    return isValidConvertable(target, 'Invalid target.');
}


function fromCsv(path: string) {
    try {
        const csv = readFileSync(path, 'utf8').split('\n');
        const [localesStr, ...valueStr] = csv;
        const locales = localesStr.split(',');
        const model: { [key: string]: any } = {};   // tslint:disable-line

        locales.shift();

        for (const valueS of valueStr) {
            if (!valueS) {
                continue;
            }
            const [key, ...vals] = valueS.split(',');

            for (const [i, locale] of locales.entries()) {
                if (!model[locale]) {
                    model[locale] = {};
                }

                if (!vals[i]) {
                    continue;
                }

                const v = model[locale][key];

                if (!v && v !== '') {
                    model[locale][key] = vals[i];
                    continue;
                }

                switch (v.constructor) {    // tslint:disable-line
                    case Array: {
                        if (vals[i] !== '') {
                            v.push(vals[i]);
                        }
                    } break;
                    case String: {
                        model[locale][key] = [v];
                        if (vals[i] !== '') {
                            model[locale][key].push(vals[i]);
                        }
                    } break;
                }
            }
        }

        return model;
    } catch (e) {
        console.log('Something went wrong while trying to fetch the csv file. See the logs below:\n');
        console.log(e);
    }
}

function toCsv(model: any) {    // tslint:disable-line
    if (!model) {
        return console.log('Something went wrong!');
    }
    const locales = Object.keys(model);

    const obj: { [key: string]: any } = {};     // tslint:disable-line

    for (const [i, locale] of locales.entries()) {
        const keys = Object.keys(model[locale]);

        for (const key of keys) {
            const value = model[locale][key] || '';
            switch (value.constructor) {    // tslint:disable-line
                case String: {
                    if (!obj[key]) {
                        obj[key] = new Array(locales.length).fill('');
                    }

                    obj[key][i] = model[locale][key];
                } break;
                case Array: {
                    if (!obj[key]) {
                        obj[key] = [];
                    }

                    // ! WORKAROUND for the case, that a key is a string in one instance and an array in another
                    if (obj[key].length > 0 && [0].constructor === String) {
                        obj[key] = [obj[key]];
                    }

                    while (obj[key].length < value.length) {
                        obj[key].push(new Array(locales.length).fill(''));
                    }

                    for (const [k, v] of value.entries()) {
                        obj[key][k][i] = v;
                    }
                } break;
                case Object: {
                    const k = Object.keys(value);
                    for (const k in value) {
                        if (!value.hasOwnProperty(k)) {
                            continue;
                        }
                        const v = value[k];
                        const newKey = `${key}.${k}`;

                        if (!obj[newKey]) {
                            obj[newKey] = new Array(locales.length).fill('');
                        }

                        obj[newKey][i] = v;
                    }
                } break;
            }
        }
    }

    let csv = `key,${locales.join(',')}\n`;
    for (const k in obj) {
        if (obj[k][0].constructor === Array) {
            for (const arr of obj[k]) {
                csv += `${k},${arr.join(',')}\n`;
            }
        } else {
            csv += `${k},${obj[k].join(',')}\n`;
        }
    }

    writeFileSync('./commands/response.csv', csv);
    return csv;
}

function fromI18N(path: string) {
    try {
        const files = readdirSync(path);
        const model: { [key: string]: any } = {};   // tslint:disable-line
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
    } catch (e) {
        console.log('Something went wrong while trying to fetch i18n files. See the logs below:\n');
        console.log(e);
    }
}

function toI18N(model: any) {       // tslint:disable-line
    if (!model) {
        return console.log('Something went wrong.');
    }
    const obj: { [key: string]: any } = {};     // tslint:disable-line
    for (const locale in model) {
        if (!model.hasOwnProperty(locale)) {
            continue;
        }

        const obj: { [key: string]: any } = {       // tslint:disable-line
            translation: model[locale]
        };

        for (const platform of ['AlexaSkill', 'GoogleAction']) {
            const key = `${locale}-${platform}`;
            if (model[key]) {
                obj[platform] = {
                    translation: model[key]
                };
                delete model[key];
            }
        }

        obj[locale] = obj;
        writeFileSync(`./commands/i18n/${locale}.json`, JSON.stringify(obj, null, '\t'));
    }
    return obj;
}