import { Command, flags } from '@oclif/command';
import {
  DEFAULT_TARGET,
  getProject,
  JovoTaskContext,
  TARGET_ALL,
  TARGET_INFO,
  TARGET_MODEL,
  TARGET_ZIP,
} from 'jovo-cli-core';
import Listr = require('listr');
import * as _ from 'lodash';
import { addBaseCliOptions, deployTargets, JovoCliRenderer, platforms } from '../utils';
import {
  ANSWER_CANCEL,
  promptListForProjectId,
  promptOverwriteProjectFiles,
  promptOverwriteReverseBuild,
} from '../utils/Prompts';
import { buildReverseTask, getTask } from '../utils/Tasks';

export class Get extends Command {
  static description = 'Downloads an existing platform project into the platforms folder.';

  static examples = [
    'jovo get alexaSkill --skill-id amzn1.ask.skill.xxxxxxxx',
    'jovo get googleAction --project-id testproject-xxxxxx',
  ];

  static flags = {
    locale: flags.string({
      char: 'l',
      description: 'Locale of the language model.\n<en-US|de-DE|etc>',
    }),
    target: flags.string({
      char: 't',
      description: 'Target of build.',
      options: [
        TARGET_ALL,
        TARGET_INFO,
        TARGET_MODEL,
        TARGET_ZIP,
        ...deployTargets.getAllPluginTargets(),
      ],
    }),
    stage: flags.string({
      description: 'Takes configuration from specified stage.',
    }),
    build: flags.boolean({
      description: 'Runs build after get. Works only with --reverse.',
      char: 'b',
    }),
    reverse: flags.boolean({
      char: 'r',
      description: 'Builds Jovo language model from platfrom specific language model.',
    }),
    overwrite: flags.boolean({
      description: 'Forces overwrite of existing project.',
    }),
    debug: flags.boolean({
      hidden: true,
      default: false,
    }),
  };

  static args = [{ name: 'platform', options: platforms.getAllAvailable(), required: true }];

  async run() {
    try {
      platforms.addCliOptions('get', Get.flags);
      addBaseCliOptions(Get.flags);

      const { args, flags } = this.parse(Get);

      if (!platforms.validateCliOptions('get', flags)) {
        this.exit();
      }

      const project = getProject();
      await project.init();

      const types: string[] = [];
      if (args.platform) {
        types.push(args.platform);
      } else {
        types.push(...platforms.getAll(args.platform, flags.stage));
      }

      const tasks = new Listr([], {
        renderer: new JovoCliRenderer(),
        collapse: false,
      });

      try {
        project.getConfig(flags.stage);
      } catch (err) {
        this.error('Could not load app.json.');
      }

      const config: JovoTaskContext = {
        types,
        debug: flags.debug,
      };

      for (const type of config.types) {
        const platform = platforms.get(type);

        // TODO: Refactor!!
        // Try to get platform id only from the files and not from the cli arguments. That is important
        // because it gets used to check if data already exists and if it should be overwritten
        let platformConfigIds = platform.getPlatformConfigIds(project, {});

        if (!flags.overwrite && Object.keys(platformConfigIds).length > 0) {
          const { overwrite } = await promptOverwriteProjectFiles();
          if (overwrite === ANSWER_CANCEL) {
            this.exit();
          }
        }

        // Look now for the config ids also in the cli arguments
        // TODO: index signature does not match
        platformConfigIds = platform.getPlatformConfigIds(
          project,
          // @ts-ignore
          flags,
        );

        _.merge(config, platformConfigIds);
        // Apply platform specific config values
        _.merge(config, platform.getPlatformConfigValues(project, flags));
        _.merge(config, {
          locales: project.getLocales(flags.locale),
          targets: project.getTargets('get', flags.target, flags.stage),
          stage: project.getStage(flags.stage!),
        });

        // If no project got found prompt user to select one
        if (Object.keys(platformConfigIds).length === 0) {
          const choices = await platform.getExistingProjects(config);
          const answers = await promptListForProjectId(choices);
          // @ts-ignore
          config[platform.constructor.ID_KEY] = answers.id;
        }

        if (flags.reverse) {
          // take locales from alexaSkill/models directory
          try {
            config.locales = platform.getLocales(flags.locale);
          } catch (err) {
            config.locales = undefined;
          }

          if (flags.overwrite) {
            config.reverse = true;
          } else if (project.hasModelFiles(config.locales)) {
            const answers = await promptOverwriteReverseBuild();
            if (answers.promptOverwriteReverseBuild === ANSWER_CANCEL) {
              this.exit();
            } else {
              config.reverse = answers.promptOverwriteReverseBuild;
            }
          }
        }

        for (const task of getTask(config)) {
          tasks.add(task);
        }
      }

      if (flags.build && flags.reverse) {
        tasks.add({
          title: 'Building language model platform model...',
          task(ctx) {
            return buildReverseTask(ctx);
          },
        });
      }

      await tasks.run(config);
      this.log();
      this.log('  Build completed.');
      this.log();
    } catch (err) {
      this.error(`There was a problem:\n${err}`);
    }
  }
}
