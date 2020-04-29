import { Command, flags } from '@oclif/command';
import {
  DEFAULT_TARGET,
  getProject,
  InputFlags,
  JovoTaskContext,
  TARGET_ALL,
  TARGET_INFO,
  TARGET_MODEL,
  TARGET_ZIP,
  JovoCliError,
} from 'jovo-cli-core';
import Listr = require('listr');
import * as _ from 'lodash';
import { addBaseCliOptions, deployTargets, JovoCliRenderer, platforms } from '../utils';
import { deployTask } from '../utils/Tasks';

export class Deploy extends Command {
  static description = 'Deploys the project to the voice platform.';

  static examples = [
    'jovo deploy --locale en-US --platform alexaSkill --stage dev',
    'jovo deploy --target zip',
  ];

  static flags: InputFlags = {
    locale: flags.string({
      char: 'l',
      description: 'Locale of the language model.\n<en-US|de-DE|etc>',
    }),
    platform: flags.string({
      char: 'p',
      description: 'Specifies a build platform.',
      options: platforms.getAllAvailable(),
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
    src: flags.string({
      char: 's',
      description: 'Path to source files.\n Default: <project directory>',
    }),
    debug: flags.boolean({
      hidden: true,
      default: false,
    }),
  };

  async run() {
    try {
      platforms.addCliOptions('deploy', Deploy.flags);
      addBaseCliOptions(Deploy.flags);

      const { flags } = this.parse(Deploy);

      if (!platforms.validateCliOptions('deploy', flags)) {
        this.exit();
      }

      const project = getProject();
      await project.init();

      const tasks = new Listr([], {
        renderer: new JovoCliRenderer(),
        collapse: false,
      });

      const config: JovoTaskContext = {
        locales: project.getLocales(flags.locale),
        types: platforms.getAll(flags.platform, flags.stage),
        targets: project.getTargets('deploy', flags.target, flags.stage),
        src:
          flags.src ||
          (project.jovoConfigReader!.getConfigParameter('src', flags.stage) as string) ||
          project.getProjectPath(),
        stage: project.getStage(flags.stage!),
        debug: flags.debug,
        frameworkVersion: project.frameworkVersion,
      };

      // TODO: refactor!!!
      if (
        config.types.length === 0 &&
        (!config.targets ||
          config.targets.length === 0 ||
          !deployTargets.getAllPluginTargets().some((el) => config.targets!.includes(el)))
      ) {
        this.error(
          'Couldn\'t find a platform folder. Please use the "jovo build" command to create platform-specific files.',
        );
      }

      for (const type of config.types) {
        const platform = platforms.get(type);
        _.merge(config, platform.getPlatformConfigIds(project, flags));
        _.merge(config, platform.getPlatformConfigValues(project, flags));
      }

      for (const task of deployTask(config)) {
        tasks.add(task);
      }

      await tasks.run(config);
      this.log();
      this.log('Deployment completed.');
      this.log();
    } catch (err) {
      if (err instanceof JovoCliError) {
        throw err;
      }
      this.error(`There was a problem:\n${err}`);
    }
  }
}
