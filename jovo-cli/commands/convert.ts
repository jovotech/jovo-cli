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
             * convert cms
             * from spreadsheet to i18n
             * from spreadsheet to airtable
             * from i18n to spreadsheet
             * fom i18n to airtable
             * from airtable to i18n
             * from airtable to spreadsheet
             */

            const unifiedForm = {
                locales: ['en-US', 'de-DE'],
                keys: [
                    'welcome',
                    'goodbye',
                    'welcome_arr',
                    'welcome_obj.speech',
                    'welcome_obj.reprompt'
                ],
                values: [
                    ['Welcome', 'Willkommen'],
                    ['Goodbye.', 'Tschüss'],
                    [
                        ['Hello', 'Hallo'],
                        ['Hey', ''],
                        ['Hi', 'Moin'],
                    ],
                    ['Welcome here.', 'Willkommen hier']
                ]
            };

            console.log('Executing...');

            const origin = args.options.from;
            const target = args.options.to;

            if (origin === 'i18n' && target === 'spreadsheet') {
                toSpreadsheet(fromI18N('./commands/i18n'), '');
            }
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
    const [headersStr, ...values] = csv;
    const headers = headersStr.split(',');
    headers.shift();
    return { headers, values };
}

function toSpreadsheet(obj: any, path: string) {
    console.log(obj);
    const { locales, keys, values } = obj;
    let csv = `${locales.join(',')}\n`;
    const body: { [key: string]: any } = {};

    for (const [i, key] of keys.entries()) {
        for (let j = 0; j < locales.length; j++) {
            const value = values[i][j] || '';
            if (value.constructor === Array) {
                if (!body[key]) {
                    body[key] = [];
                }
                for (const [l, v] of value.entries()) {
                    const newArr = body[key][l] || [];

                    if (body[key].length > 0 &&
                        value.length > body[key].length &&
                        newArr.length + 1 < locales.length) {
                        const length = newArr.length;
                        for (let m = 0; m < (j - length); m++) {
                            newArr.push('');
                        }
                    }

                    newArr.push(v);

                    body[key][l] = newArr;
                }
            } else if (typeof value === 'object') {
                // TODO
                console.log('Key: ', key);
                console.log('Value: ', value);
                for (const subKey in value) {
                    const newKey = `${key}.${subKey}`;
                    if (!body[newKey]) {
                        body[newKey] = [];
                    }
                    body[newKey].push(value[subKey]);
                }
                console.log('Body: ', body);
            } else if (typeof value === 'string') {
                body[key] = values[i].join(',');
            }
        }

        if (body[key].constructor === Array) {
            for (const value of body[key]) {
                csv += `${key},${value.join(',')}\n`;
            }
        } else if (typeof body[key] === 'object') {
            csv += `${key},${body[key].join(',')}\n`;
        } else if (typeof body[key] === 'string') {
            csv += `${key},${body[key]}\n`;
        }
    }
    console.log(csv);

    // writeFileSync(path, csv);
}

function fromI18N(path: string) {
    const files = readdirSync(path);
    const obj: { [key: string]: any } = {};
    const locales: string[] = [];
    const keys: string[] = [];
    const values: any[] = [];
    files.forEach((locale) => {
        const i18nModel = JSON.parse(readFileSync(`${path}/${locale}`, 'utf8'));
        for (const prop in i18nModel) {
            if (!i18nModel.hasOwnProperty(prop)) {
                continue;
            }

            let model = i18nModel[prop];
            if (prop !== 'translation') {
                model = i18nModel[prop]['translation'];
                obj[prop] = model;
            } else {
                obj[locale.replace('.json', '')] = model;
            }
            for (const key in i18nModel[prop]) {
                if (keys.indexOf(key) === -1) {
                    keys.push(key);
                }
            }
        }
    });

    for (const locale in obj) {
        locales.push(locale);
        for (const [i, key] of keys.entries()) {
            const value = obj[locale][key] || '';
            if (i === values.length) {
                values.push([value]);
            } else {
                values[i].push(value);
            }
        }
    }

    return { locales, keys, values };
}