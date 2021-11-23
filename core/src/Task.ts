import chalk from 'chalk';
import _merge from 'lodash.merge';
import ora from 'ora';
import { JovoCliError } from './JovoCliError';
import { Log } from '.';

export type TaskFunction = () => string[] | string | void | Promise<string[] | string | void>;

export interface TaskConfig {
  enabled: boolean;
  indentation: number;
}

export class Task {
  private readonly title: string;
  private readonly action: Task[] | TaskFunction;
  private readonly config: TaskConfig;
  private spinner?: ora.Ora;

  constructor(title: string, action: Task[] | TaskFunction = [], config?: Partial<TaskConfig>) {
    this.title = title;
    this.action = action;
    this.config = _merge(this.getDefaultConfig(), config);
  }

  getDefaultConfig(): TaskConfig {
    return {
      enabled: true,
      indentation: 0,
    };
  }

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
    this.config.indentation = indentation;
  }

  enable(): void {
    this.config.enabled = true;
  }

  disable(): void {
    this.config.enabled = false;
  }

  async run(): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    if (Array.isArray(this.action)) {
      Log.info(this.title.trim(), { indent: this.config.indentation });
      for (const action of this.action) {
        action.indent(this.config.indentation + 2);
        await action.run();
      }
    } else {
      if (Log.isRaw()) {
        Log.info(this.title.trim(), { indent: this.config.indentation });
      } else {
        // Initialize spinner here, since options can change after the task has been initialized
        this.spinner = ora({
          text: this.title,
          interval: 50,
          indent: this.config.indentation,
        });
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        this.spinner['stream'].cursorTo(this.config.indentation);
        this.spinner.start();
      }

      try {
        let output: string[] | string | void = await this.action();
        if (!Log.isRaw()) {
          this.spinner!.succeed();
        }
        if (output) {
          if (!Array.isArray(output)) {
            output = [output];
          }
          for (const str of output) {
            Log.info(chalk.white.dim(str), { indent: this.config.indentation + 2 });
          }
        }
      } catch (error) {
        if (!Log.isRaw()) {
          this.spinner!.fail();
        }

        if (error instanceof JovoCliError) {
          throw error;
        }

        throw new JovoCliError({ message: (error as Error).message });
      }
    }
  }
}
