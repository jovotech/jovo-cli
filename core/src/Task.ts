import chalk from 'chalk';
import Spinnies from 'spinnies';
import { JovoCliError } from './JovoCliError';

export class Task {
  private static spinnies: Spinnies = new Spinnies();
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
      throw new JovoCliError(
        "Can't push Task instance if the current Task is a function.",
        '@jovotech/cli-core',
        'Consider converting the provided function to a Task instance.',
      );
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

    const spinnerId: number = Math.random();
    Task.spinnies.add(`spinner-${spinnerId}`, {
      text: this.title,
      indent: this.indentation,
    });
    if (Array.isArray(this.action)) {
      for (const action of this.action) {
        action.indent(this.indentation + 2);
        try {
          await action.run();
        } catch (error) {
          Task.spinnies.fail(`spinner-${spinnerId}`);
          if (error instanceof JovoCliError) {
            throw error;
          }

          throw new JovoCliError(error.message, 'JovoCliCore');
        }
      }
      Task.spinnies.succeed(`spinner-${spinnerId}`, { succeedColor: 'white' });
    } else {
      try {
        let output: string[] | string | void = await this.action();
        Task.spinnies.succeed(`spinner-${spinnerId}`, { succeedColor: 'white' });
        if (output) {
          if (!Array.isArray(output)) {
            output = [output];
          }
          for (const str of output) {
            Task.spinnies.add(chalk.white.dim(str), {
              indent: this.indentation + 2,
              status: 'non-spinnable',
            });
          }
        }
      } catch (error) {
        Task.spinnies.fail(`spinner-${spinnerId}`);
        if (error instanceof JovoCliError) {
          throw error;
        }

        throw new JovoCliError(error.message, 'JovoCliCore');
      }
    }
  }
}
