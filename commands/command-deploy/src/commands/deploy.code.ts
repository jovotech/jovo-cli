import { Input as InputFlags } from '@oclif/command/lib/flags';
import { flags, JovoCli, PluginCommand } from '@jovotech/cli-core';

const jovo: JovoCli = JovoCli.getInstance();

export class DeployCode extends PluginCommand {
  static id: string = 'deploy:code';
  static description: string = 'Deploys project code.';

  static examples: string[] = [
    'jovo deploy --locale en-US --platform alexaSkill --stage dev',
    'jovo deploy --target zip',
  ];

  static flags: InputFlags<any> = {
    locale: flags.string({
      char: 'l',
      description: 'Locale of the language model.\n<en|de|etc>',
      multiple: true,
    }),
    platform: flags.string({
      char: 'p',
      description: 'Specifies a build platform.',
      options: (() => {
        return jovo.getPlatforms();
      })(),
    }),
    target: flags.string({
      char: 't',
      description: 'Target of build.',
      // options: [TARGET_ALL, TARGET_INFO, TARGET_MODEL, TARGET_ZIP, ...deployTargets.getAllPluginTargets()],
    }),
    stage: flags.string({
      description: 'Takes configuration from specified stage.',
    }),
    src: flags.string({
      char: 's',
      description: `Path to source files.\n Default: ${jovo.$projectPath}`,
    }),
  };

  async run() {}
}
