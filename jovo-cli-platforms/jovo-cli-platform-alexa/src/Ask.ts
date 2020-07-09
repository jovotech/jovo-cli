import * as chalk from 'chalk';
import { execSync, exec } from 'child_process';
import * as inquirer from 'inquirer';
import { Utils, JovoCliError, ERROR_TYPE } from 'jovo-cli-core';
import * as _ from 'lodash';

import { AskSkillList, JovoTaskContextAlexa } from '.';

export const DEFAULT_ASK_PROFILE = 'default';

/**
 * Returns ask error object for ask-cli@v1.
 * @param {string} method
 * @param {*} stderr
 * @return {Error}
 */
export function getAskErrorV1(method: string, stderr: string) {
  const module = 'jovo-cli-platform-alexa';
  const badRequest = 'Error code:';
  stderr = stderr.replace(/[\x00-\x1F\x7F-\x9F]/u, '');
  if (stderr.indexOf(badRequest) > -1) {
    try {
      const json = stderr.substring(stderr.indexOf(badRequest) + badRequest.length + 4);
      const parsedMessage = JSON.parse(json);
      const customError = parsedMessage.message;
      let violations = '';

      if (parsedMessage.violations) {
        parsedMessage.violations.forEach((violation: object) => {
          violations += `${_.get(violation, 'message')}\n`;
        });
      }

      return new JovoCliError(`${method}:${customError}`, module, violations);
    } catch (error) {
      return new JovoCliError(`${method}:${stderr}`, module);
    }
  }
  return new JovoCliError(stderr, module);
}

/**
 * Checks if ask cli is installed and returns version.
 * @return {Promise<any>}
 */
export function checkAsk() {
  try {
    const version = execSync('ask --version', { stdio: 'pipe' }).toString();
    return version[0];
  } catch (err) {
    throw new JovoCliError(
      'Jovo requires ASK CLI',
      'jovo-cli-platform-alexa',
      'Install the ask-cli with npm install ask-cli -g. Read more here: https://developer.amazon.com/docs/smapi/quick-start-alexa-skills-kit-command-line-interface.html',
      ERROR_TYPE.WARN,
    );
  }
}

/**
 * Generates choice list from skills
 * @param {*} json
 * @return {Array}
 */
export function prepareSkillList(askSkill: AskSkillList) {
  askSkill.skills.sort((a, b) => {
    // Turn your strings into dates, and then subtract them
    // to get a value that is either negative, positive, or zero.
    return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime();
  });
  const map = {
    development: 'dev',
  };
  const choices: Array<{
    name: string;
    value: string;
  }> = [];
  for (const item of askSkill.skills) {
    let message = '';
    const key = Object.keys(item.nameByLocale)[0];
    message += item.nameByLocale[key];
    // @ts-ignore
    const stage = map[item.stage] ? map[item.stage] : item.stage;
    // @ts-ignore
    message += ' ' + (stage === 'live' ? chalk.green(stage) : chalk.yellow(stage)) + ' ';
    message += '- ' + item.lastUpdated.substr(0, 10);
    // @ts-ignore
    message += ' ' + chalk.grey(item.skillId);

    choices.push({
      name: message,
      value: item.skillId,
    });
  }
  return choices;
}

/**
 * Creates skill in ASK
 * @param {*} ctx
 * @param {string} skillJsonPath
 * @return {Promise<any>}
 */
export function askApiCreateSkill(
  ctx: JovoTaskContextAlexa,
  skillJsonPath: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(
      `ask api create-skill -f "${skillJsonPath}" ${ctx.askProfile ? `-p ${ctx.askProfile}` : ''}`,
      (error, stdout, stderr) => {
        if (error) {
          if (stderr) {
            return reject(getAskErrorV1('askApiCreateSkill', stderr));
          }
        }
        const skillId = stdout
          .substr(stdout.indexOf('Skill ID: ') + 'Skill ID: '.length, 52)
          .trim();
        resolve(skillId);
      },
    );
  });
}

/**
 * Returns list of skills that are owned by the given profile
 * @param {*} ctx
 * @return {Promise<any>}
 */
export function askApiListSkills(ctx: JovoTaskContextAlexa): Promise<inquirer.ChoiceType[]> {
  const returnPromise = new Promise((resolve, reject) => {
    exec(
      `ask api list-skills ${ctx.askProfile ? `-p ${ctx.askProfile}` : ''}`,
      (error, stdout, stderr) => {
        if (error) {
          if (stderr) {
            return reject(getAskErrorV1('askApiListSkills', stderr));
          }
        }
        resolve(JSON.parse(stdout));
      },
    );
  });

  return returnPromise.then((askSkill) => {
    return Promise.resolve(prepareSkillList(askSkill as AskSkillList));
  });
}

/**
 * Updates model of skill for the given locale
 * @param {*} ctx
 * @param {*} modelPath
 * @param {string} locale
 * @return {Promise<any>}
 */
export function askApiUpdateModel(
  ctx: JovoTaskContextAlexa,
  modelPath: string,
  locale: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    exec(
      `ask api update-model -s ${ctx.skillId} -f ${modelPath} -l ${locale} ${
        ctx.askProfile ? `-p ${ctx.askProfile}` : ''
      }`,
      (error, stdout, stderr) => {
        if (error) {
          if (stderr) {
            return reject(getAskErrorV1('askApiUpdateModel', stderr));
          }
        }
        resolve();
      },
    );
  });
}

/**
 * Updates skill information
 * @param {*} ctx
 * @param {string} skillJsonPath
 * @return {Promise<any>}
 */
export function askApiUpdateSkill(ctx: JovoTaskContextAlexa, skillJsonPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    exec(
      `ask api update-skill -s ${ctx.skillId} -f ${skillJsonPath} ${
        ctx.askProfile ? `-p ${ctx.askProfile}` : ''
      }`,
      (error, stdout, stderr) => {
        if (error) {
          if (stderr) {
            return reject(getAskErrorV1('askApiUpdateSkill', stderr));
          }
        }
        resolve();
      },
    );
  });
}

/**
 * Gets build status of model
 * @param {*} ctx
 * @return {Promise<any>}
 */
export function askApiGetSkillStatus(ctx: JovoTaskContextAlexa): Promise<object> {
  return new Promise((resolve, reject) => {
    exec(
      `ask api get-skill-status -s ${ctx.skillId} ${ctx.askProfile ? `-p ${ctx.askProfile}` : ''}`,
      (error, stdout, stderr) => {
        if (error) {
          if (stderr) {
            return reject(getAskErrorV1('askApiGetSkillStatus', stderr));
          }
        }
        try {
          resolve(JSON.parse(stdout));
        } catch (error) {
          reject(error);
        }
      },
    );
  });
}

/**
 * Saves skill information to json file
 * @param {*} ctx
 * @param {string} skillJsonPath
 * @return {Promise<any>}
 */
export function askApiGetSkill(ctx: JovoTaskContextAlexa, skillJsonPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    exec(
      `ask api get-skill -s ${ctx.skillId} > "${skillJsonPath}" ${ctx.askProfile ? `-p ${ctx.askProfile}` : ''}`,
      (error, stdout, stderr) => {
        if (error) {
          if (stderr) {
            return reject(getAskErrorV1('askApiGetSkill', stderr));
          }
        }
        resolve();
      },
    );
  });
}

/**
 * Saves model to file
 * @param {*} ctx
 * @param {string} skillJsonPath
 * @param {string} locale
 * @return {Promise<any>}
 */
export function askApiGetModel(
  ctx: JovoTaskContextAlexa,
  skillJsonPath: string,
  locale: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    exec(
      `ask api get-model -s ${ctx.skillId} -l ${locale} > "${skillJsonPath}" ${ctx.askProfile ? `-p ${ctx.askProfile}` : ''}`,
      (error, stdout, stderr) => {
        if (error) {
          if (stderr) {
            return reject(getAskErrorV1('askApiGetModel', stderr));
          }
        }
        resolve();
      },
    );
  });
}

/**
 * Saves model to file
 * @param {*} ctx
 * @return {Promise<any>}
 */
export function askApiEnableSkill(ctx: JovoTaskContextAlexa): Promise<void> {
  return new Promise((resolve, reject) => {
    exec(
      `ask api enable-skill -s ${ctx.skillId} ${ctx.askProfile ? `-p ${ctx.askProfile}` : ''}`,
      (error, stdout, stderr) => {
        if (error) {
          if (stderr) {
            return reject(getAskErrorV1('askApiEnableSkill', stderr));
          }
        }
        resolve();
      },
    );
  });
}

/**
 * Saves account linking information to file
 * @param {*} ctx
 * @return {Promise<any>}
 */
export function askApiGetAccountLinking(ctx: JovoTaskContextAlexa): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(
      `ask api get-account-linking -s ${ctx.skillId} ${ctx.askProfile ? `-p ${ctx.askProfile}` : ''}`,
      {},
      (error, stdout, stderr) => {
        if (error) {
          if (stderr && stderr.indexOf('AccountLinking is not present for given skillId') > 0) {
            resolve();
          } else if (stderr) {
            return reject(getAskErrorV1('askApiGetAccountLinking', stderr));
          }
        }
        resolve(stdout);
      },
    );
  });
}

/**
 * Asks for model status every 5 seconds
 * Checks only status of first locale
 * @param {*} config
 * @return {Promise<any>}
 */
export function getModelStatus(config: JovoTaskContextAlexa): Promise<void> {
  return Utils.wait(5000)
    .then(() => askApiGetSkillStatus(config))
    .then((status) => {
      // return Promise.reject(new Error(status));
      if (
        _.get(status, `interactionModel.${config.locales![0]}.lastUpdateRequest.status`) ===
        'IN_PROGRESS'
      ) {
        return getModelStatus(config);
      } else if (
        _.get(status, `interactionModel.${config.locales![0]}.lastUpdateRequest.status`) ===
        'SUCCEEDED'
      ) {
        Promise.resolve();
      } else {
        Promise.reject();
      }
    });
}

/**
 * Asks for skillStatus every 5 seconds
 * @param {*} config
 * @return {Promise<any>}
 */
export function getSkillStatus(config: JovoTaskContextAlexa): Promise<void> {
  return Utils.wait(5000)
    .then(() => askApiGetSkillStatus(config))
    .then((status) => {
      // return Promise.reject(new Error(status));
      if (_.get(status, `manifest.lastUpdateRequest.status`) === 'IN_PROGRESS') {
        return getSkillStatus(config);
      } else if (_.get(status, `manifest.lastUpdateRequest.status`) === 'SUCCEEDED') {
        return Promise.resolve();
      } else {
        if (
          _.get(status, `manifest.lastUpdateRequest.status`) === 'FAILED' &&
          _.get(status, `manifest.lastUpdateRequest.errors[0].message`)
        ) {
          return Promise.reject(
            new JovoCliError(
              _.get(status, `manifest.lastUpdateRequest.errors[0].message`),
              'jovo-cli-platform-alexa',
            ),
          );
        }
      }
    });
}
