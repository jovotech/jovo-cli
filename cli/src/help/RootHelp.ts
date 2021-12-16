import { chalk, isJovoCliError, JovoCliError, Log, PluginCommand } from '@jovotech/cli-core';
import { Command, Topic } from '@oclif/config';
import { HelpBase } from '@oclif/help';
import { CommandHelp } from './CommandHelp';

export default class HelpOutput extends HelpBase {
  globalFlags: Record<string, Command.Flag> = PluginCommand.flags as Record<string, Command.Flag>;

  showHelp(argv: string[]): void {
    try {
      const commands: Command.Plugin[] = this.config.commands.filter(
        (command) => !command.hidden && command.id !== 'help',
      );

      const subject: string | undefined = this.getHelpSubject(argv);

      if (!subject) {
        // Show root help
        this.printDescription();
        this.printVersion();
        this.printUsage();
        this.printCommands(commands);
        this.printGlobalFlags();

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

      throw new JovoCliError({ message: 'Command not found' });
    } catch (error) {
      if (!isJovoCliError(error)) {
        error = new JovoCliError({ message: error.message });
      }

      JovoCliError.print(error as JovoCliError);
      process.exit(1);
    }
  }

  showCommandHelp(command: Command.Plugin): void {
    if (command.description) {
      Log.info(command.description || '');
      Log.spacer();
    }

    const help: CommandHelp = new CommandHelp(command, this.config, this.opts);
    Log.info(help.generate());
  }

  showTopicHelp(topic: Topic): void {
    this.printTopic(topic);

    // Collect all corresponding commands and print them
    const topicCommands: Command.Plugin[] = this.config.commands.filter((cmd) =>
      cmd.id.startsWith(topic.name + ':'),
    );

    if (topicCommands.length) {
      this.printCommands(topicCommands, false);
    }
  }

  private printDescription(): void {
    const description: string =
      this.config.pjson.oclif.description || this.config.pjson.description || '';

    Log.info(description);
    Log.spacer();
    Log.info('To get started, run the following command:');
    Log.info(`$ ${this.config.bin} new`, { indent: 2 });
    Log.spacer();
    Log.info('Read the docs: https://www.jovo.tech/docs/cli');
    Log.spacer();
  }

  private printVersion(): void {
    Log.info('VERSION');
    Log.info(this.config.userAgent, { indent: 2 });
    Log.spacer();
  }

  private printUsage(): void {
    Log.info('USAGE');
    Log.info('$ jovo [COMMAND]', { indent: 2 });
    Log.spacer();
  }

  private printCommands(commands: Command.Plugin[], showTopic: boolean = true): void {
    Log.info('COMMANDS');
    const commandTopics: string[] = commands
      .filter((cmd) => cmd.id.includes(':'))
      .map((cmd) => {
        return cmd.id.split(':')[0];
      })
      .filter((command, index, self) => self.indexOf(command) === index);

    const commandsWithoutTopics: Command.Plugin[] = commands.filter(
      (cmd) => !cmd.id.includes(':') && !commandTopics.includes(cmd.id),
    );

    for (const command of commandsWithoutTopics) {
      Log.info(`${command.id} - ${command.description}`, { indent: 2 });
      Log.spacer();
    }

    for (const topic of commandTopics) {
      const topicCommands: Command.Plugin[] = commands.filter((cmd) => cmd.id.includes(topic));

      if (!topicCommands.length) {
        continue;
      }

      if (showTopic) {
        Log.info(chalk.dim(topic.toUpperCase()), { indent: 2 });
      }
      for (const command of topicCommands) {
        Log.info(`${command.id} - ${command.description}`, { indent: showTopic ? 4 : 2 });
      }
      Log.spacer();
    }
  }

  private printGlobalFlags(): void {
    const validFlags: Command.Flag[] = Object.entries(this.globalFlags)
      .map(([flagKey, flag]) => {
        flag.name = flagKey;
        return flag;
      })
      .filter((flag) => !flag.hidden);

    Log.info(CommandHelp.prototype.flags.call(this, validFlags)!);
  }

  private printTopic(topic: Topic): void {
    if (topic.description) {
      Log.info(topic.description);
      Log.spacer();
    }

    Log.info('USAGE');
    Log.info(`$ ${this.config.bin} ${topic.name}:COMMAND`, { indent: 2 });
    Log.spacer();
  }

  /**
   * Returns the current subject, i.e. "build" for "jovo help build"
   * or "jovo build --help"
   * @param argv - Current command line arguments
   */
  private getHelpSubject(argv: string[]): string | undefined {
    for (const arg of argv) {
      if (arg === 'help' || arg === '--help' || arg === '-h') continue;
      if (arg.startsWith('-')) return;
      return arg;
    }
  }
}
