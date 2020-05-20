import { Command, flags } from '@oclif/command';
import chalk from 'chalk';
import { ListrTask } from 'listr';
import * as csvToJson from 'csvtojson';
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs-extra';
import * as _ from 'lodash';
import Listr = require('listr');
import { JovoCliRenderer } from '../utils';

export class Convert extends Command {
  static description = 'Converts .csv-files to i18n.json-files and vice versa.';

  static examples = [
    'jovo convert i18nToCsv --from ./i18n/',
    'jovo convert csvToI18n --from ./responses.csv',
  ];

  static flags = {
    from: flags.string({
      description: 'The path to your src file.',
    }),
    to: flags.string({
      description: 'Destination path.',
    }),
  };

  static args = [{ name: 'fn', options: ['i18nToCsv', 'csvToI18n'], required: true }];

  async run() {
    const { args, flags } = this.parse(Convert);
    const origin = flags.from;
    let target = flags.to;

    if (!isValidOrigin(origin)) {
      return;
    }

    this.log(`\n jovo convert: ${Convert.description}`);
    this.log(chalk.grey('   >> Learn more: https://jovo.tech/docs/cli/convert\n'));

    // If target does not end with "/", place a "/" to the end of it.
    target = target ? target.replace(/\/?$/, '/') : target;

    const tasksArr: ListrTask[] = [];
    let successMsg,
      failMsg = '';

    switch (args.fn) {
      case 'i18nToCsv':
        {
          tasksArr.push(
            {
              title: 'Converting to .csv file...',
              async task(ctx) {
                ctx.csv = await new Promise((res) =>
                  setTimeout(() => {
                    const model = toCsv(fromI18N(origin!));
                    res(model);
                  }, 500),
                );
              },
            },
            {
              title: 'Writing .csv file...',
              async task(ctx) {
                await new Promise((res) =>
                  setTimeout(() => {
                    writeFileSync(`${target || './'}responses.csv`, ctx.csv);
                    res();
                  }, 500),
                );
              },
            },
          );

          successMsg = 'Successfully converted i18n to csv.';
          failMsg = 'Something went wrong while converting from i18n. Check the logs below:\n';
        }
        break;
      case 'csvToI18n':
        {
          tasksArr.push(
            {
              title: 'Converting to i18n files...',
              async task(ctx) {
                ctx.model = await new Promise((res) =>
                  setTimeout(async () => {
                    const model = toI18N(await fromCsv(origin!));
                    res(model);
                  }, 500),
                );
              },
            },
            {
              title: 'Writing i18n files...',
              async task(ctx) {
                await new Promise((res) =>
                  setTimeout(() => {
                    const { model } = ctx;

                    // Write file for every locale in model.
                    for (const locale of Object.keys(model)) {
                      const dest = target || './src/i18n/';
                      if (!existsSync(dest)) {
                        mkdirSync(dest);
                      }
                      writeFileSync(
                        `${dest}${locale}.json`,
                        JSON.stringify(model[locale], null, 4),
                      );
                    }
                    res();
                  }, 500),
                );
              },
            },
          );

          successMsg = 'Successfully converted csv to i18n.';
          failMsg = 'Something went wrong while converting from csv. Check the logs below:\n';
        }
        break;
      default: {
      }
    }

    const tasks = new Listr(tasksArr, {
      renderer: new JovoCliRenderer(),
      collapse: false,
    });

    try {
      await tasks.run();
      this.log();
      this.log(successMsg);
      this.log();
    } catch (err) {
      this.error(`${failMsg}\n${err}`);
    }
  }
}

/**
 * Checks if the given origin path is valid or not.
 * @param origin
 */
function isValidOrigin(origin: string | undefined) {
  if (!origin) {
    console.log(
      '\nThe path from your originating files has to be set.\n\nYou can choose between setting a single file or an entire folder.',
    );
    return false;
  }
  return true;
}

/**
 * Converts a .csv file to a globally unique JSON-object.
 * @param path: The path where the .csv file is originating from
 */
async function fromCsv(path: string) {
  return await csvToJson().fromFile(path);
}

/**
 * Converts a unique JSON-object to a .csv file.
 * @param model: The model to convert
 */
function toCsv(model: Array<{ [key: string]: string }> | undefined) {
  // tslint:disable-line:no-any
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

/**
 * Converts one or multiple i18n files to a unique JSON-object.
 * @param path: The path where the file(s) is/are originating from.
 */
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

  const model: Array<{ [key: string]: string }> = [];

  // Read every file and feed it to a parse function.
  for (const entry of files) {
    const i18nModel = JSON.parse(readFileSync(`${path}/${entry}`, 'utf8'));
    const locale = entry.replace('.json', '');
    parseI18nModel(locale, i18nModel, model);
  }

  return model;
}

/**
 * Recursive function to process an i18n file to write to a unique JSON-object.
 * @param locale: The current locale to work with, can be a language locale (e.g. en-US), or a locale with tags (e.g. en-US-RETURN_USER)
 * @param i18nModel: The i18n model
 * @param model: The resulting model to parse the i18n model too
 */
function parseI18nModel(
  locale: string,
  i18nModel: { [key: string]: any },
  model: Array<{ [key: string]: string }>,
) {
  for (const prop of Object.keys(i18nModel)) {
    // If the current key is "translation", push its values to the model, otherwise go recursive with "${locale}-${key}" as the new locale.
    if (prop === 'translation') {
      for (const key of Object.keys(i18nModel[prop])) {
        const value = i18nModel[prop][key];
        switch (value.constructor) {
          case Array:
            {
              for (const v of value) {
                writeToJson(locale, key, v, model);
              }
            }
            break;
          case String:
            {
              writeToJson(locale, key, value, model);
            }
            break;
          case Object: {
            for (const subKey of Object.keys(value)) {
              writeToJson(locale, `${key}.${subKey}`, value[subKey], model);
            }
          }
          default: {
          }
        }
      }
    } else {
      parseI18nModel(`${locale}-${prop}`, i18nModel[prop], model);
    }
  }
  return model;
}

/**
 * Function to write a value to a unique pattern JSON-object.
 * @param locale: The current locale to use as the key.
 * @param key: The key to find the entry in the model.
 * @param value: The value to write.
 * @param model: The model to write the locale and value into.
 */
function writeToJson(
  locale: string,
  key: string,
  value: string,
  model: Array<{ [key: string]: string }>,
) {
  // If the value includes a comma, surround it with ".
  if (value.includes(',')) {
    value = `"${value}"`;
  }

  // Go through every entry of the model and place an empty string for a new locale.
  // Then save the index of the entry where to write the real value.
  let index;
  for (const [i, keyValue] of model.entries()) {
    if (!keyValue[locale]) {
      keyValue[locale] = '';
    }

    if (keyValue.key === key) {
      index = i;
      // If the locale already exists, this entry is already set and the search continues.
      if (keyValue[locale] && keyValue[locale] !== '') {
        index = undefined;
        continue;
      }
    }
  }

  // If there is an index, write the value, else push a new entry onto the model.
  if (index) {
    model[index][locale] = value;
  } else {
    const entry: { [key: string]: string } = {};
    // If there already exists an entry, take all keys and push empty values for each key onto the new entry.
    if (model[0]) {
      for (const k of Object.keys(model[0])) {
        if (k === 'key') {
          entry[k] = key;
        } else {
          entry[k] = '';
        }
      }
      entry[locale] = value;
    } else {
      entry.key = key;
      entry[locale] = value;
    }
    model.push(entry);
  }
}

/**
 * Function to convert a unique pattern JSON-object to a JSON-object containing i18n friendly entries.
 * @param model: The model to convert
 */
function toI18N(model: Array<{ [key: string]: string }>) {
  const i18n: { [key: string]: any } = {}; // tslint:disable-line:no-any

  for (const keyValue of model) {
    const { key, ...locales } = keyValue;

    for (const locale of Object.keys(locales)) {
      // If the locale does not yet exist, push a new entry onto i18n.
      if (!i18n[locale]) {
        i18n[locale] = {
          translation: {},
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
          case String:
            {
              // If there already exists a value as a string, push it with the new one onto an array.
              existingValue = [existingValue, value];
            }
            break;
          case Array:
            {
              existingValue.push(value);
            }
            break;
          default: {
          }
        }
      }
      _.set(i18n[locale].translation, key, existingValue);
    }
  }

  // If there exists a platform-specific locale, push it onto the original locale.
  for (const key of Object.keys(i18n)) {
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
