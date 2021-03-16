import chalk from 'chalk';
import {
  JovoCli,
  JovoCliPreset,
  printHighlight,
  ProjectProperties,
  prompt,
  validateLocale,
} from 'jovo-cli-core';

const jovo: JovoCli = JovoCli.getInstance();

export async function promptPreset(): Promise<{ selectedPreset: string }> {
  return await prompt(
    {
      type: 'select',
      message: 'Pick a preset:',
      name: 'selectedPreset',
      choices: [
        // List all presets already defined in Jovo user config.
        ...jovo.$userConfig.getPresets().map((preset: JovoCliPreset) => {
          const language: string = chalk.blueBright(preset.language);
          const projectName: string = chalk.underline.blueBright(preset.projectName);
          const output: string = `(${projectName}/, ${language})`;
          return {
            title: preset.name,
            description: output,
            value: preset.name,
          };
        }),
        {
          title: 'Or manually select features...',
          value: 'manual',
        },
      ],
    },
    {
      onCancel() {
        process.exit();
      },
    },
  );
}

export async function promptProjectProperties(args: any, flags: any): Promise<ProjectProperties> {
  const props: ProjectProperties = await prompt(
    [
      {
        name: 'projectName',
        message: "Please enter your project's name:",
        type: !args.directory ? 'text' : false,
        initial: 'helloworld',
      },
      // Prompt for Programming Language (js/ts).
      {
        name: 'language',
        message: 'Select the programming language you want to use:',
        type: !flags.language && !flags.typescript ? 'select' : false,
        choices: [
          { title: 'TypeScript', value: 'typescript' },
          { title: 'JavaScript', value: 'javascript' },
        ],
      },
      // Prompt for Platforms (multiple).
      {
        name: 'platforms',
        message: 'Choose the platforms you want to use (select with space):',
        type: 'multiselect',
        choices: [
          { title: 'Alexa', value: 'alexa' },
          { title: 'Google', value: 'google' },
        ],
      },
      {
        name: 'locales',
        message: 'Type the locales you want to use (comma-separated):',
        type: !flags.locale ? 'list' : false,
        initial: 'en',
        validate(locales: string) {
          try {
            for (const locale of locales.split(',')) {
              validateLocale(locale.trim());
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
        type: 'select',
        choices: [
          { title: 'Yes, ESLint + Prettier', value: true },
          { title: "No (or I'll add it later)", value: false },
        ],
      },
      {
        name: 'unitTesting',
        message: 'Do you want to use Unit Testing?',
        type: 'select',
        choices: [
          { title: 'Yes, Jest', value: true },
          { title: "No (or I'll add it later)", value: false },
        ],
      },
    ],
    {
      onCancel() {
        process.exit();
      },
    },
  );

  return props;
}

export async function promptSavePreset(): Promise<{ savePreset: boolean }> {
  return await prompt(
    {
      name: 'savePreset',
      message: `Do you want to save this preset to ${printHighlight('.jovo/config')}?`,
      type: 'select',
      choices: [
        { title: 'Yes', value: true },
        { title: 'No', value: false },
      ],
    },
    {
      onCancel() {
        process.exit();
      },
    },
  );
}

export async function promptPresetName(): Promise<{ presetName: string }> {
  return await prompt(
    {
      name: 'presetName',
      message: 'Preset name:',
      type: 'text',
      initial: 'default',
      validate(presetName: string) {
        if (/\s/g.test(presetName.trim())) {
          return 'Preset name cannot include whitespace!';
        }

        return true;
      },
      format(presetName: string) {
        return presetName.trim();
      },
    },
    {
      onCancel() {
        process.exit();
      },
    },
  );
}
