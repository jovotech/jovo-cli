import {
  MarketplacePlugin,
  Preset,
  printHighlight,
  printUserInput,
  ProjectProperties,
  prompt,
  validateLocale,
} from '@jovotech/cli-core';
import chalk from 'chalk';
import { NewArgs, NewFlags } from './commands/new';
import { fetchMarketPlace } from './utilities';

export async function promptPreset(presets: Preset[]): Promise<{ selectedPreset: string }> {
  return await prompt(
    {
      type: 'select',
      message: 'Pick a preset:',
      name: 'selectedPreset',
      choices: [
        // List all presets already defined in Jovo user config.
        ...presets.map((preset: Preset) => {
          const projectName: string = chalk.underline.blueBright(preset.projectName);
          const output = `(${projectName}/)`;
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
  args: NewArgs,
  flags: NewFlags,
): Promise<ProjectProperties> {
  // Override, thus preanswer certain prompts, depending on process arguments.
  prompt.override({
    projectName: args.directory,
    language: flags.language || (flags.typescript ? 'typescript' : undefined),
    locales: flags.locale,
  });

  const props: ProjectProperties = await prompt(
    [
      {
        name: 'projectName',
        message: "Please enter your project's name:",
        type: 'text',
        initial: 'helloworld',
        onState() {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          this.rendered = printUserInput(this.rendered);
        },
      },
      // Prompt for Platforms (multiple)
      {
        name: 'platforms',
        message: 'Choose the platforms you want to use (select with space):',
        type: 'multiselect',
        instructions: false,
        choices: fetchMarketPlace()
          .filter((plugin) => plugin.tags.includes('platforms'))
          .map((plugin) => ({
            title: printUserInput(plugin.name),
            value: plugin,
            description: plugin.description,
          })),
      },
      {
        name: 'locales',
        message: 'Type the locales you want to use (comma-separated):',
        type: 'list',
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
        { title: printUserInput('Yes'), value: true },
        { title: printUserInput('No'), value: false },
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
      onState() {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        this.rendered = printUserInput(this.rendered);
      },
    },
    {
      onCancel() {
        process.exit();
      },
    },
  );
}

export async function promptServer(
  servers: prompt.Choice[],
): Promise<{ server: MarketplacePlugin }> {
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
  message: string,
  plugins: prompt.Choice[],
): Promise<{ plugins: MarketplacePlugin[] }> {
  return await prompt(
    {
      name: 'plugins',
      message,
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
