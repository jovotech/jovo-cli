import { chalk, Log } from '@jovotech/cli-core';
import { Command } from '@oclif/config';
import BaseCommandHelp from '@oclif/plugin-help/lib/command';
import { renderList } from '@oclif/plugin-help/lib/list';

export default class CommandHelp extends BaseCommandHelp {
  flags(flags: Command.Flag[]): string | undefined {
    const output: string = renderList(
      flags.map((flag) => {
        const label: string[] = [];

        if (!flag.helpLabel) {
          if (flag.char) {
            label.push(`-${flag.char}, `);
          }

          if (flag.name) {
            if (flag.type === 'boolean' && flag.allowNo) {
              label.push(`--[no-]${flag.name.trim()}`);
            } else {
              label.push(`--${flag.name.trim()}`);
            }
          }
        } else {
          label.push(flag.helpLabel);
        }

        // Append options if defined
        if (flag.type === 'option') {
          if (flag.options) {
            label.push(chalk.dim(`={${flag.options.join('|')}}`));
          } else {
            label.push(chalk.dim(`={${flag.helpLabel?.trim() || flag.name.trim()}}`));
          }
        }

        // Add description to flag
        const description: string[] = [];
        if (flag.required) {
          description.push('(required) ');
        }

        description.push(flag.description || '');

        if (flag.type === 'option' && flag.default?.length) {
          description.push(`\n[default: ${flag.default}]`);
        }

        const s = [label.join(''), chalk.dim(description.join(''))];
        return s;
      }),
      { stripAnsi: this.opts.stripAnsi, maxWidth: this.opts.maxWidth - 2 },
    );

    return [chalk.bold('FLAGS'), Log.info(output, { dry: true, indent: 2, newLine: false })].join(
      '\n',
    );
  }
}
