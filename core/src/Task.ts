import chalk from 'chalk';
import Spinnies from 'spinnies';
import { JovoCliError } from './JovoCliError';
import { Log } from '.';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
// Override the behaviour of spinnies that forces the user to pick a colour for spinner text.
// This way, the default color of the Command Line can be used.
chalk['default'] = (text: string) => text;

export class Task {
  private static spinners: Spinnies = new Spinnies({
    failPrefix: chalk.red('x'),
  });
  private enabled: boolean = true;
  private indentation: number = 0;

  constructor(
    private title: string,
    private action:
      | Task[]
      | (() => string[] | string | void | Promise<string[] | string | void>) = [],
  ) {}

  add(...actions: Task[]): void {
    if (!Array.isArray(this.action)) {
      throw new JovoCliError({
        message: "Can't push Task instance if the current Task is a function.",
        details: 'Consider converting the provided function to a Task instance.',
      });
    }
    this.action.push(...actions);
  }

  indent(indentation: number): void {
    this.indentation = indentation;
  }

  enable(): void {
    this.enabled = true;
  }

  disable(): void {
    this.enabled = false;
  }

  async run(): Promise<void> {
    if (!this.enabled) {
      return;
    }

    const spinnerId: string = `spinner-${Math.random()}`;

    if (Array.isArray(this.action)) {
      Log.info(this.title.trim(), { indent: this.indentation });
      for (const action of this.action) {
        action.indent(this.indentation + 2);
        await action.run();
      }
    } else {
      if (Log.isRaw()) {
        Log.info(this.title.trim(), { indent: this.indentation });
      } else {
        Task.spinners.add(spinnerId, {
          text: this.title,
          indent: this.indentation,
        });

        // Let Command Line decide what color to display on succeed.
        // This has to be overridden after adding the spinner to avoid filtering invalid colours.
        Task.spinners.pick(spinnerId).succeedColor = 'default';
      }

      try {
        let output: string[] | string | void = await this.action();
        if (!Log.isRaw()) {
          Task.spinners.succeed(spinnerId);
        }
        if (output) {
          if (!Array.isArray(output)) {
            output = [output];
          }
          for (const str of output) {
            if (Log.isRaw()) {
              Log.info(chalk.white.dim(str), { indent: 2 });
            } else {
              // Spinnies does not support output with stdout directly, so provide output by adding a non-spinnable spinner.
              Task.spinners.add(chalk.white.dim(str), {
                indent: this.indentation + 2,
                status: 'non-spinnable',
              });
            }
          }
        }
      } catch (error) {
        if (!Log.isRaw()) {
          Task.spinners.fail(spinnerId);
        }

        if (error instanceof JovoCliError) {
          throw error;
        }

        throw new JovoCliError({ message: (error as Error).message });
      }
    }
  }
}
