import { flags } from '@oclif/command';
import { Input as InputFlags } from '@oclif/command/lib/flags';
import { JovoCli, PluginCommand } from 'jovo-cli-core';

const jovo: JovoCli = JovoCli.getInstance();

export class Deploy extends PluginCommand {
  static id: string = 'deploy';
  static description: string = 'Deploys the project to the voice platform.';

  static examples: string[] = [
    'jovo deploy --locale en-US --platform alexaSkill --stage dev',
    'jovo deploy --target zip',
  ];

  static flags: InputFlags<any> = {};

  static args = [];

  async run() {}
}
