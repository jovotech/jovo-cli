import * as _ from 'lodash';
import { getProject, JovoTaskContext, JovoCliDeploy, TARGET_ZIP, TARGET_ALL } from 'jovo-cli-core';
import { ListrTaskWrapper, ListrTask } from 'listr';
import chalk from 'chalk';
import { existsSync, mkdirSync } from 'fs';
import { platforms, deployTargets } from '.';
import Listr = require('listr');
import { ANSWER_BACKUP } from './Prompts';
// TODO: Change to tsModule import
const parseJson = require('parse-json');

const project = getProject();

export function buildTask(ctx: JovoTaskContext) {
  const platformsPath = project.getPlatformsPath();
  if (!existsSync(platformsPath)) {
    mkdirSync(platformsPath);
  }

  const buildPlatformTasks: ListrTask[] = [];

  // Check if model-file is valid.
  const validationTasks: ListrTask[] = [];
  const locales = project.getLocales(ctx.locales);
  let modelFileContent: string;

  for (const locale of locales) {
    validationTasks.push({
      title: locale,
      async task(ctx: JovoTaskContext, task: ListrTaskWrapper) {
        try {
          modelFileContent = await project.getModelFileJsonContent(locale);
        } catch (err) {
          if (err.code === 'ENOENT') {
            // Check if model file is a .js module.
            if (existsSync(project.getModelPath(locale, 'js'))) {
              return task.skip('Model file is of type .js, not .json, so check got skipped.');
            }

            throw new Error(
              `Language model file could not be found. Expected location: "${err.path}".`,
            );
          }
          throw err;
        }

        // JSON validation.
        try {
          parseJson(modelFileContent);
        } catch (err) {
          throw new Error(`Model-File is not valid JSON: ${err.message}.`);
        }

        // Do not validate the model file if it should be ignored.
        if (ctx.ignoreTasks && ctx.ignoreTasks.includes('model-validation')) {
          return;
        }

        // Validate content of platform-specific properties.
        for (const type of ctx.types) {
          const platform = platforms.get(type);
          project.validateModel(locale, platform.getModelValidator());
        }
      },
    });
  }

  buildPlatformTasks.push({
    title: 'Initializing build process...',
    task(ctx: JovoTaskContext) {
      const backupLocales: ListrTask[] = [];
      backupLocales.push(
        {
          title: `Collecting platform configuration from project.js.\n   ${chalk.grey(
            `Platforms: ${ctx.types.join(', ')}`,
          )}`,
          task() {
            // TODO: Does nothing?
            return;
          },
        },
        {
          title: `Collecting Jovo language model files from ./models folder.\n   ${chalk.grey(
            `Locales: ${locales.join(', ')}`,
          )}`,
          task() {
            return;
          },
        },
        {
          title: 'Validating model files.',
          task() {
            return new Listr(validationTasks);
          },
        },
      );

      return new Listr(backupLocales);
    },
  });

  // Apply platform-specific tasks.
  for (const type of ctx.types) {
    const platform = platforms.get(type);
    buildPlatformTasks.push(...platform.getBuildTasks(ctx));
  }

  return buildPlatformTasks;
}

export function deployTask(ctx: JovoTaskContext): ListrTask[] {
  if (!ctx.targets || ctx.targets.length === 0) {
    return [];
  }

  // Only create a .zip of the project's source folder.
  if (ctx.targets.length === 1 && ctx.targets.includes(TARGET_ZIP)) {
    return [project.deployTaskZipProjectSource(ctx)];
  }

  const platformsPath = project.getPlatformsPath();
  if (!existsSync(platformsPath)) {
    mkdirSync(platformsPath);
  }

  // Get targets to which to deploy (except info and model).
  const targets: JovoCliDeploy[] = [];
  let targetNames: string[] = [];

  if (ctx.targets.includes(TARGET_ALL)) {
    targetNames = deployTargets.getAllAvailable();
  } else {
    targetNames = ctx.targets;
  }

  const pluginDeployTargets = deployTargets.getAllPluginTargets();
  let preDeployTasks: string[] = [];
  for (const targetName of targetNames) {
    // Skip target, if it is not for a plugin.
    if (!pluginDeployTargets.includes(targetName)) {
      break;
    }

    const target = deployTargets.get(targetName);
    targets.push(target);

    preDeployTasks = _.union(preDeployTasks, target.getPreDeployTasks());
  }

  const deployPlatformTasks: ListrTask[] = [];

  if (ctx.targets.includes(TARGET_ZIP) && !preDeployTasks.includes(TARGET_ZIP)) {
    preDeployTasks.push(TARGET_ZIP);
  }

  for (const target of preDeployTasks) {
    if (target === TARGET_ZIP) {
      deployPlatformTasks.push(project.deployTaskZipProjectSource(ctx));
    }
  }

  // Push platform-specifics
  for (const type of ctx.types) {
    const platform = platforms.get(type);
    deployPlatformTasks.push(...platform.getDeployTasks(ctx, targets));
  }

  return deployPlatformTasks;
}

export function buildReverseTask(ctx: JovoTaskContext) {
  const buildReverseSubTasks: ListrTask[] = [
    {
      title: 'Creating backups...',
      enabled(ctx) {
        return ctx.reverse === ANSWER_BACKUP;
      },
      task(ctx) {
        const backupLocaleTasks: ListrTask[] = [];

        for (const locale of ctx.locales) {
          backupLocaleTasks.push({
            title: locale,
            task() {
              return project.backupModel(locale);
            },
          });
        }
        return new Listr(backupLocaleTasks);
      },
    },
  ];

  for (const type of ctx.types) {
    const platform = platforms.get(type);
    buildReverseSubTasks.push(...platform.getBuildReverseTasks(ctx));
  }

  return new Listr(buildReverseSubTasks);
}

export function getTask(ctx: JovoTaskContext) {
  const platformsPath = project.getPlatformsPath();
  if (!existsSync(platformsPath)) {
    mkdirSync(platformsPath);
  }

  const tasks: ListrTask[] = [];

  for (const type of ctx.types) {
    const platform = platforms.get(type);
    tasks.push(...platform.getGetTasks(ctx));
  }

  return tasks;
}
