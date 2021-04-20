import chalk from 'chalk';
import {
  JovoCli,
  Preset,
  MarketplacePlugin,
  printHighlight,
  ProjectProperties,
  prompt,
  validateLocale,
  CliArgs,
  CliFlags,
} from '@jovotech/cli-core';
import { New } from '../commands/new';
import { fetchMarketPlace, printUserInput } from '.';

const jovo: JovoCli = JovoCli.getInstance();

export async function promptPreset(): Promise<{ selectedPreset: string }> {
  return await prompt(
    {
      type: 'select',
      message: 'Pick a preset:',
      name: 'selectedPreset',
      choices: [
        // List all presets already defined in Jovo user config.
        ...jovo.$userConfig.getPresets().map((preset: Preset) => {
          const language: string = chalk.blueBright(preset.language);
          const projectName: string = chalk.underline.blueBright(preset.projectName);
          const output = `(${projectName}/, ${language})`;
          return {
            title: printUserInput(preset.name),
            description: output,
            value: preset.name,
          };
        }),
        {
          title: printUserInput('Or manually select features...'),
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

export async function promptProjectProperties(
  args: CliArgs<typeof New>,
  flags: CliFlags<typeof New>,
): Promise<ProjectProperties> {
  const props: ProjectProperties = await prompt(
    [
      {
        name: 'projectName',
        message: "Please enter your project's name:",
        type: !args.directory ? 'text' : false,
        initial: 'helloworld',
        onState() {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          this.rendered = printUserInput(this.rendered);
        },
      },
      // Prompt for Programming Language (js/ts).
      {
        name: 'language',
        message: 'Select the programming language you want to use:',
        type: !flags.language && !flags.typescript ? 'select' : false,
        choices: [
          { title: printUserInput('TypeScript'), value: 'typescript' },
          { title: printUserInput('JavaScript'), value: 'javascript' },
        ],
      },
      // Prompt for Platforms (multiple).
      {
        name: 'platforms',
        message: 'Choose the platforms you want to use (select with space):',
        type: 'multiselect',
        choices: fetchMarketPlace()
          .filter((plugin) => plugin.tags.includes('platforms'))
          .map((plugin) => ({
            title: printUserInput(plugin.name),
            value: plugin,
          })),
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
            return error.message;
          }

          return true;
        },
        onState() {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          this.rendered = printUserInput(this.rendered);
        },
      },
      {
        name: 'linter',
        message: 'Do you want to use a Linter?',
        type: 'select',
        choices: [
          { title: printUserInput('Yes, ESLint + Prettier'), value: true },
          { title: printUserInput("No (or I'll add it later)"), value: false },
        ],
      },
      {
        name: 'unitTesting',
        message: 'Do you want to use Unit Testing?',
        type: 'select',
        choices: [
          { title: printUserInput('Yes, Jest'), value: true },
          { title: printUserInput("No (or I'll add it later)"), value: false },
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

export async function promptServer(servers: prompt.Choice[]): Promise<{ server: string }> {
  return await prompt(
    {
      name: 'server',
      message: 'Which server do you want to use?',
      type: 'select',
      choices: servers,
    },
    {
      onCancel() {
        process.exit();
      },
    },
  );
}

export async function promptPlugins(
  plugins: prompt.Choice[],
): Promise<{ plugins: MarketplacePlugin[] }> {
  return await prompt(
    {
      name: 'plugins',
      message: 'Which plugins do you want to use?',
      type: 'multiselect',
      choices: plugins,
    },
    {
      onCancel() {
        process.exit();
      },
    },
  );
}
