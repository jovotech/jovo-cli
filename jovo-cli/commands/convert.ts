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
    // append headers
    let csv = `key,${headers.join(',')}\n`;
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
            headers = ['key'];
        } 
        headers.push(locale);
        obj.headers = headers;

        const values = obj.values;

        for (const key in i18nModel) {
            if (!i18nModel.hasOwnProperty(key)) {
                continue;
            }

            if (key === 'translation') {
                for (const k in i18nModel[key]) {
                    const val = i18nModel[key][k];

                    if (val.constructor === Array) {
                        val.forEach((v: string) => {
                            values.push(`${k},${v}`);
                        })
                    } else if (typeof val === 'string') {
                        values.push(`${k},${val}`);
                    } else if (typeof val === 'object') {
                        for (const j in val) {
                            values.push(`${k}.${j},${val[j]}`);
                        }
                    }
                }
            }
        }
        console.log(obj);
    })
}