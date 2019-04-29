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
                'en-US': {
                    WELCOME: 'Welcome.'
                },
                'de-DE': {
                    WELCOME: 'Willkommen.'
                },
                // headers: ['en-US', 'de-DE'],
                // values: {
                //     WELCOME: ['Welcome.', 'Willkommen.'],
                //     GOODBYE: [
                //         ['Bye', 'Tschüss'],
                //         ['Bye bye!', 'Bis dann!']
                //     ]
                // }
            }

            

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

    for (const [i, key] of keys.entries()) {
        let string = '';
        csv += key + ',';
        for (const [j, locale] of locales.entries()) {
            const value = values[i][j] || '';

            if (value.constructor === Array) {
                for (const [k, val] of value.entries()) {
                    csv += val;
                    if (k < value.length - 1) {
                        csv += ',';
                    } else {
                        csv += '\n';
                    }
                }
            } else if (typeof value === 'string') {
                csv += value;
                if (j < locales.length - 1) {
                    csv += ',';
                } else {
                    csv += '\n';
                }
            }
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
            const value = obj[locale][key];
            if (i === values.length) {
                values.push([value]);
            } else {
                values[i].push(value);
            }
        }
    }

    return { locales, keys, values };
}