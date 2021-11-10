import { PluginCommand, JovoCliError, Log, printComment } from '@jovotech/cli-core';
import { Command, Topic } from '@oclif/config';
import { HelpBase } from '@oclif/plugin-help';
import { sortBy } from '@oclif/plugin-help/lib/util';
import CommandHelp from '@oclif/plugin-help/lib/command';
import { cli as ux } from 'cli-ux';

export default class HelpOutput extends HelpBase {
  globalFlags: Record<string, Command.Flag> = PluginCommand.flags as Record<string, Command.Flag>;

  showHelp(argv: string[]): void {
    const commands: Command.Plugin[] = this.config.commands;

    const subject: string | undefined = this.getHelpSubject(argv);

    if (!subject) {
      // Show root help
      this.printDescription();
      this.printVersion();
      this.printUsage();

      this.printCommands(commands);

      return;
    } else {
      const command: Command.Plugin | undefined = this.config.findCommand(subject);
      if (command) {
        return this.showCommandHelp(command);
      }

      const topic: Topic | undefined = this.config.findTopic(subject);
      if (topic) {
        return this.showTopicHelp(topic);
      }
    }

    throw new JovoCliError({ message: 'Command not found!' });
  }

  showCommandHelp(command: Command.Plugin): void {
    const flags: Command.Flag[] = sortBy(
      Object.entries(command.flags || {})
        .filter(([, flag]) => !flag.hidden)
        .map(([key, flag]) => {
          flag.name = key;
          return flag;
        }),
      (flag: Command.Flag) => [!flag.char, flag.char, flag.name],
    );

    const args: Command.Arg[] = (command.args || []).filter((arg) => !arg.hidden);
    const com = new CommandHelp(command, this.config, this.opts);
    Log.info(com.generate());
  }

  showTopicHelp(topic: Topic): void {}

  private printDescription(): void {
    const description: string =
      this.config.pjson.oclif.description || this.config.pjson.description || '';

    Log.info(description);
    Log.spacer();
  }

  private printVersion(): void {
    Log.info('VERSION');
    Log.info(this.config.userAgent, { indent: 2 });
    Log.spacer();
  }

  private printUsage(): void {
    Log.info('USAGE');
    Log.info(printComment('# Create a new project'), { indent: 2 });
    Log.info(`$ ${this.config.bin} new`, { indent: 2 });
    Log.spacer();
    Log.info(printComment('# Build your platform files'), { indent: 2 });
    Log.info(`$ ${this.config.bin} build:platform`, { indent: 2 });
    Log.spacer();
  }

  private printCommands(commands: Command.Plugin[]): void {
    Log.info('COMMANDS');
    const commandMap: Record<string, Command.Plugin[]> = {};

    for (const command of commands) {
      if (command.hidden) {
        continue;
      }

      if (command.id.includes(':')) {
        const commandTopic: string = command.id.split(':')[0];
        if (!commandMap[commandTopic]) {
          commandMap[commandTopic] = [];
        }

        commandMap[commandTopic].push(command);
      }
    }

    for (const [topic, commands] of Object.entries(commandMap)) {
      Log.info(topic, { indent: 2 });

      for (const command of commands) {
        Log.info(`${command.id} - ${command.description}`, { indent: 4 });
      }
      Log.spacer();
    }

    Log.spacer();

    Log.info('GLOBAL FLAGS');
    for (const [flagKey, flag] of Object.entries(this.globalFlags)) {
      // @ts-ignore
      Log.info(`--${flagKey} - ${flag.description}`, { indent: 2 });
    }
  }

  private getHelpSubject(argv: string[]): string | undefined {
    for (const arg of argv) {
      if (arg === 'help' || arg === '--help' || arg === '-h') continue;
      if (arg.startsWith('-')) return;
      return arg;
    }
  }
}
