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
                headers: ['en-US', 'de-DE'],
                values: {
                    WELCOME: ['Welcome.', 'Willkommen.'],
                    GOODBYE: [
                        ['Bye', 'Tschüss'],
                        ['Bye bye!', 'Bis dann!']
                    ]
                }
            }

            console.log('Executing...');

            const origin = args.options.from;
            const target = args.options.to;

            if (origin === 'i18n' && target === 'spreadsheet') {
                fromI18N('./commands/i18n');
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
    const { headers, values } = obj;
    let csv = `key,${headers.join(',')}\n`;
    for(const key in values) {
        if(!values.hasOwnProperty(key)) {
            continue;
        }
        
    }
    values.forEach((val: string) => {
        csv += `${val}\n`;
    });

    writeFileSync(path, csv);
}

function fromI18N(path: string) {
    const files = readdirSync(path);
    const obj: { [key: string]: any } = {};
    files.forEach((locale) => {
        const i18nModel = JSON.parse(readFileSync(`${path}/${locale}`, 'utf8'));

        let headers = obj.headers;
        if(!headers) {
            headers = [];
        } 
        headers.push(locale);
        obj.headers = headers;

        let values = obj.values;
        if(!values) {
            values = {};
        }

        for (const prop in i18nModel) {
            if (!i18nModel.hasOwnProperty(prop)) {
                continue;
            }

            if (prop === 'translation') {
                for (const key in i18nModel[prop]) {
                    const value = i18nModel[prop][key];

                    if(!values[key]) {
                        values[key] = []; 
                    }
                    
                    values[key].push(value);
                }
            }
        }

        obj.values = values;
    });
    return obj;
}