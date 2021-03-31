import indentString from 'indent-string';
import ora from 'ora';
import chalk from 'chalk';
import _cloneDeep from 'lodash.clonedeep';
import { JovoCliError } from './JovoCliError';

export class Task {
  private enabled: boolean = true;
  private indentation: number = 2;

  constructor(
    private title: string,
    private action:
      | Task[]
      | (() => string[] | string | void | Promise<string[] | string | void>) = [],
  ) {}

  add(...actions: Task[]) {
    if (!Array.isArray(this.action)) {
      throw new JovoCliError(
        "Can't push Task instance if the current Task is a function.",
        'jovo-cli-core',
        'Consider converting the provided function to a Task instance.',
      );
    }
    this.action.push(...actions);
  }

  indent(indentation: number) {
    this.indentation = indentation;
  }

  enable() {
    this.enabled = true;
  }

  disable() {
    this.enabled = false;
  }

  async run() {
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
            console.log(chalk.white.dim(indentString(`>> ${str}`, this.indentation + 2)));
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
