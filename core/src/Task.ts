import indentString from 'indent-string';
import ora from 'ora';
import chalk from 'chalk';
import { JovoCliError } from './JovoCliError';

export class Task {
  private enabled = true;
  private indentation = 0;

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

    if (Array.isArray(this.action)) {
      console.log(indentString(this.title.trim(), this.indentation));
      for (const action of this.action) {
        action.indent(this.indentation + 2);
        await action.run();
      }
    } else {
      const spinner = ora({
        text: this.title.trim(),
        indent: this.indentation,
      });

      // This moves the cursor to the position specified with indentation. Without this setting enabled,
      // Ora will render one frame without indentation.
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      spinner.linesToClear = 1;

      spinner.start();

      try {
        let output: string[] | string | void = await this.action();
        spinner.succeed();
        if (output) {
          if (!Array.isArray(output)) {
            output = [output];
          }
          for (const str of output) {
            console.log(chalk.white.dim(indentString(`${str}`, this.indentation + 2)));
          }
        }
      } catch (error) {
        spinner.fail();
        if (error instanceof JovoCliError) {
          throw error;
        }

        throw new JovoCliError(error.message, 'JovoCliCore');
      }
    }
  }
}
