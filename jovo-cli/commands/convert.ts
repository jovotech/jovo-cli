import * as Vorpal from 'vorpal';
import { addBaseCliOptions } from '../utils/Utils';
import { readFileSync, readdirSync, writeFileSync } from 'fs';

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
            /**
             * Unified form: 
             * {
             *      'en-US': {
             *          key: 'value',
             *          key_2: ['value_1', 'value_2']  
             *      },
             *      'de-DE': {
             *          key: 'german value'
             *      }
             * }
             */

            console.log('Executing...');

            const origin = args.options.from;
            const target = args.options.to;

            // if (origin === 'i18n' && target === 'spreadsheet') {
            //     toSpreadsheet(fromI18N('./commands/i18n'), './commands/response.csv');
            // }
            // fromSpreadsheet('./commands/response.csv');
            toI18N(fromI18N('./commands/i18n'), './commands');
        });
}

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

/**
 * Converts csv to unified format of 
 * {
 *      headers: array of locales
 * }
 */
function fromSpreadsheet(path: string) {
    const csv = readFileSync(path, 'utf8').split('\n');
    console.log(csv)
    const [localesStr, ...valueStr] = csv;
    const locales = localesStr.split(',');
    const model: { [key: string]: any } = {};

    locales.shift();

    for (const valueS of valueStr) {
        const [key, ...vals] = valueS.split(',');

        for (const [i, locale] of locales.entries()) {
            if (!model[locale]) {
                model[locale] = {};
            }

            console.log('----------------------------------------------');
            console.log('Locale: ', locale);
            console.log('Model: ', model[locale]);
            console.log('Key: ', key);

            const v = model[locale][key];
            console.log('Value: ', vals[i]);
            console.log('Existing value: ', v);

            if (!v) {
                model[locale][key] = vals[i];
                continue;
            }

            switch (v.constructor) {
                case Array: {
                    while (v.length <= i) {
                        v.push('');
                    }

                    v.push(vals[i]);
                } break;
                case String: {
                    model[locale][key] = new Array(locales.length).fill('');
                    console.log('Value before being overwritten: ', v);
                    model[locale][key][0] = v;
                    model[locale][key][i] = vals[i];
                    console.log('Value after: ', model[locale][key]);
                } break;
                case Object: {
                    console.log('---------------------------------------------------------------');
                } break;
            }

        }
        console.log('Model: ', model);
    }

    console.log(model);
    // return { headers, values };
}

function toSpreadsheet(model: any, path: string) {
    const locales = Object.keys(model);
    console.log('locales: ', locales);

    const obj: { [key: string]: any } = {};

    for (const [i, locale] of locales.entries()) {
        const keys = Object.keys(model[locale]);

        for (const [j, key] of keys.entries()) {
            const value = model[locale][key];
            switch (value.constructor) {
                case String: {
                    if (!obj[key]) {
                        obj[key] = new Array(locales.length).fill('');
                    }

                    obj[key][i] = model[locale][key]
                } break;
                case Array: {
                    if (!obj[key]) {
                        obj[key] = [];
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
            csv += `${k},${obj[k].join(',')}\n`
        }
    }

    writeFileSync(path, csv);
}

function fromI18N(path: string) {
    const files = readdirSync(path);
    const model: { [key: string]: any } = {};
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

function toI18N(model: any, path: string) {
    // const locales = Object.keys(model);


    for (const locale in model) {
        if(!model.hasOwnProperty(locale)) {
            continue;
        }

        const obj: { [key: string]: any } = {
            translation: model[locale]
        };

        for (const platform of ['AlexaSkill', 'GoogleAction']) {
            const key = `${locale}-${platform}`;
            if (model[key]) {
                obj[platform] = {
                    translation: model[key]
                }
                delete model[key];
            }
        }

        writeFileSync(`${path}/${locale}.json`, JSON.stringify(obj, null, '\t'));
    }
}