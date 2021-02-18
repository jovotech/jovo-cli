import chalk from 'chalk';
import { prompt } from 'enquirer';
import {
  JovoCli,
  JovoCliPreset,
  printHighlight,
  ProjectProperties,
  validateLocale,
} from 'jovo-cli-core';

const jovo: JovoCli = JovoCli.getInstance();

export async function promptPreset(): Promise<{ selectedPreset: string }> {
  return (await prompt({
    name: 'selectedPreset',
    message: 'Pick a preset:',
    type: 'select',
    choices: [
      // List all presets already defined in Jovo user config.
      ...jovo.$userConfig.getPresets().map((preset: JovoCliPreset): {
        name: string;
        value: string;
      } => {
        // ToDo: Parse name with project props
        const language: string = chalk.blueBright(preset.language);
        const projectName: string = chalk.underline.blueBright(preset.projectName);
        const output: string = `${preset.name} ("${projectName}", ${language})`;
        return {
          name: output,
          value: preset.name,
        };
      }),
      { name: 'Select features...', value: 'manual' },
    ],
    result() {
      // Since enquirer returns the prompt's name by default, we need to get the value manually.
      // @ts-ignore
      return this.focused.value;
    },
  })) as { selectedPreset: string };
}

export async function promptProjectProperties(args: any, flags: any): Promise<ProjectProperties> {
  const props: ProjectProperties = await prompt([
    {
      name: 'projectName',
      message: "Please enter your project's name:",
      type: 'input',
      skip: !!args.directory,
      initial: 'helloworld',
    },
    // Prompt for Template (single).
    // ToDo: Prompt for template, store template-specific values (e.g. platform) for use in later prompts
    // {
    //   name: 'template',
    //   message: 'Choose a template:',
    //   type: 'select',
    //   skip: !!flags.template,
    //   initial: 0,
    //   choices: ['helloworld', 'google', 'alexa'],
    // },
    // Prompt for Programming Language (js/ts).
    {
      name: 'language',
      message: 'Select the programming language you want to use:',
      type: 'select',
      skip: !!flags.language || !!flags.typescript,
      choices: [
        { name: 'TypeScript', value: 'typescript' },
        { name: 'JavaScript', value: 'javascript' },
      ],
      result() {
        // Since enquirer returns the prompt's name by default, we need to get the value manually.
        // @ts-ignore
        return this.focused.value;
      },
    },
    // Prompt for Platforms (multiple).
    {
      name: 'platforms',
      message: 'Choose the platforms you want to use (select with space):',
      type: 'multiselect',
      choices: ['alexaSkill', 'googleAssistant'],
    },
    {
      name: 'locales',
      message: 'Type the locales you want to use (comma-seperated):',
      skip: !!flags.locale,
      type: 'list',
      validate(locales: string[] | string) {
        if (typeof locales === 'string') {
          locales = [locales];
        }

        try {
          for (const locale of locales) {
            validateLocale(locale);
          }
        } catch (error) {
          return error.msg;
        }

        return true;
      },
    },
    {
      name: 'linter',
      message: 'Do you want to use a Linter?',
      type: 'confirm',
      initial: true,
    },
    {
      name: 'unitTesting',
      message: 'Do you want to use Unit Testing?',
      type: 'confirm',
      initial: true,
    },
  ]);

  return props;
}

export async function promptSavePreset(): Promise<{ savePreset: boolean }> {
  return (await prompt({
    name: 'savePreset',
    message: `Do you want to save this preset to ${printHighlight('.jovo/config')}?`,
    type: 'confirm',
  })) as { savePreset: boolean };
}

export async function promptPresetName(): Promise<{ presetName: string }> {
  return (await prompt({
    name: 'presetName',
    message: 'Preset name:',
    type: 'input',
    initial: 'default',
  })) as { presetName: string };
}
