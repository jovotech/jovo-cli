import * as _ from 'lodash';
import {
  getProject,
  JovoTaskContext,
  JovoCliDeploy,
  TARGET_ZIP,
  TARGET_ALL,
  JovoCliError,
} from 'jovo-cli-core';
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

            throw new JovoCliError(
              'Language model file could not be found.',
              'jovo-cli',
              `Expected location: ${err.path}`,
            );
          }

          throw new JovoCliError(err.message, 'jovo-cli');
        }

        // JSON validation.
        try {
          parseJson(modelFileContent);
        } catch (err) {
          throw new JovoCliError(`Model file is not valid JSON: ${err.message}`, 'jovo-cli');
        }

        // Do not validate the model file if it should be ignored.
        if (ctx.ignoreTasks && ctx.ignoreTasks.includes('model-validation')) {
          return;
        }

        try {
          // Validate content of platform-specific properties.
          for (const type of ctx.types) {
            const platform = platforms.get(type, ctx.stage);
            project.validateModel(locale, platform.getModelValidator());
          }
        } catch (err) {
          if (err instanceof JovoCliError) {
            throw err;
          }

          throw new JovoCliError(err.message, 'jovo-cli');
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
    const platform = platforms.get(type, ctx.stage);
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
    const platform = platforms.get(type, ctx.stage);
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
    const platform = platforms.get(type, ctx.stage);
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
    const platform = platforms.get(type, ctx.stage);
    tasks.push(...platform.getGetTasks(ctx));
  }

  return tasks;
}
