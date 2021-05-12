import { join as joinPaths } from 'path';
import type { BuildEvents, ParseContextBuild } from '@jovotech/cli-command-build';
import {
  deleteFolderRecursive,
  getResolvedLocales,
  JovoCliError,
  mergeArrayCustomizer,
  OK_HAND,
  PluginHook,
  printHighlight,
  STATION,
  Task,
  wait,
  promptOverwriteReverseBuild,
  ANSWER_CANCEL,
  REVERSE_ARROWS,
  ANSWER_OVERWRITE,
} from '@jovotech/cli-core';
import { JovoModelData, NativeFileInformation } from 'jovo-model';
import _mergeWith from 'lodash.mergewith';
import _pick from 'lodash.pick';
import _get from 'lodash.get';
import { JovoModelLex, JovoModelLexData, LexModelFile, LexModelFileResource } from 'jovo-model-lex';
import { existsSync, mkdirSync, writeFileSync } from 'fs';

import { LexCli } from '..';
import { getLexLocale, SupportedLocales, SupportedLocalesType } from '../utils';

export class BuildHook extends PluginHook<BuildEvents> {
  $plugin!: LexCli;

  install(): void {
    this.middlewareCollection = {
      'parse': [this.checkForPlatform.bind(this)],
      'before.build': [
        this.checkForCleanBuild.bind(this),
        this.validateLocales.bind(this),
        this.validateModels.bind(this),
      ],
      'build': [this.buildLexModel.bind(this)],
      'reverse.build': [this.buildReverse.bind(this)],
    };
  }

  /**
   * Checks if the currently selected platform matches this CLI plugin.
   * @param context - Context containing information after flags and args have been parsed by the CLI.
   */
  checkForPlatform(context: ParseContextBuild): void {
    // Check if this plugin should be used or not.
    if (context.flags.platform && !context.flags.platform.includes(this.$plugin.$id)) {
      this.uninstall();
    }
  }

  /**
   * Checks, if --clean has been set and deletes the platform folder accordingly.
   */
  checkForCleanBuild(): void {
    // If --clean has been set, delete the respective platform folders before building.
    if (this.$context.flags.clean) {
      deleteFolderRecursive(this.$plugin.getPlatformPath());
    }
  }

  /**
   * Checks if any provided locale is not supported, thus invalid.
   */
  validateLocales(): void {
    const locales: SupportedLocalesType[] = this.$context.locales.reduce(
      (locales: string[], locale: string) => {
        locales.push(...getResolvedLocales(locale, SupportedLocales, this.$plugin.$config.locales));
        return locales;
      },
      [],
    ) as SupportedLocalesType[];

    if (locales.length > 1) {
      throw new JovoCliError(
        `Amazon Lex does not support multiple language models (${locales.join(',')}).`,
        this.$plugin.constructor.name,
        'Please provide a locale by using the flag "--locale" or in your project configuration.',
      );
    }

    const locale: SupportedLocalesType = locales.pop()!;

    if (!SupportedLocales.includes(locale)) {
      throw new JovoCliError(
        `Locale ${printHighlight(locale)} is not supported by Lex.`,
        this.$plugin.constructor.name,
        'For more information on multiple language support: https://docs.aws.amazon.com/lex/latest/dg/how-it-works-language.html',
      );
    }
  }

  /**
   * Validates Jovo models with platform-specific validators.
   */
  async validateModels(): Promise<void> {
    // Validate Jovo model.
    const validationTask: Task = new Task(`${OK_HAND} Validating Lex model files`);

    for (const locale of this.$context.locales) {
      const localeTask = new Task(locale, async () => {
        this.$cli.$project!.validateModel(locale, JovoModelLex.getValidator());
        await wait(500);
      });

      validationTask.add(localeTask);
    }

    await validationTask.run();
  }

  async buildLexModel(): Promise<void> {
    const platformPath: string = this.$plugin.getPlatformPath();
    if (!existsSync(platformPath)) {
      mkdirSync(platformPath);
    }

    const buildTask: Task = new Task(`${STATION} Building Lex`);

    for (const modelLocale of this.$context.locales) {
      const resolvedLocales: string[] = getResolvedLocales(
        modelLocale,
        SupportedLocales,
        this.$plugin.$config.locales,
      );

      const resolvedLocalesOutput: string = resolvedLocales.join(', ');
      // If the model locale is resolved to different locales, provide task details, i.e. "en (en-US, en-CA)"".
      const taskDetails: string =
        resolvedLocalesOutput === modelLocale ? '' : `(${resolvedLocalesOutput})`;

      const localeTask: Task = new Task(`${modelLocale} ${taskDetails}`, () => {
        for (const resolvedLocale of resolvedLocales) {
          const model: JovoModelData = this.getJovoModel(modelLocale);
          const jovoModel: JovoModelLex = new JovoModelLex(model, resolvedLocale);
          // eslint-disable-next-line
          const lexModelFiles: NativeFileInformation[] =
            jovoModel.exportNative() as NativeFileInformation[];

          if (!lexModelFiles || !lexModelFiles.length) {
            throw new JovoCliError(
              `Could not build Lex files for locale "${resolvedLocale}"!`,
              this.$plugin.constructor.name,
            );
          }

          for (const file of lexModelFiles) {
            // Set configuration-specific properties.
            const resourceProperties: string[] = [
              'name',
              'version',
              'childDirected',
              'abortStatement',
              'clarificationPrompt',
              'voiceId',
              'description',
              'idleSessionTTLInSeconds',
              'detectSentiment',
            ];
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            const configResource: LexModelFileResource = _pick(
              this.$plugin.$config,
              resourceProperties,
            );
            // Additionally merge already existing model files.
            const lexModel: LexModelFile | undefined = this.$plugin.getLexModel(resolvedLocale);
            file.content.resource = _mergeWith(
              lexModel?.resource,
              file.content.resource,
              configResource,
            );

            writeFileSync(
              joinPaths(platformPath, ...file.path),
              JSON.stringify(file.content, null, 2),
            );
          }
        }
      });
      buildTask.add(localeTask);
    }

    await buildTask.run();
  }

  /**
   * Builds Jovo model files from platform-specific files.
   */
  async buildReverse(): Promise<void> {
    // Since platform can be prompted for, check if this plugin should actually be executed again.
    if (!this.$context.platforms.includes(this.$plugin.$id)) {
      return;
    }

    // Get locale to reverse build from.
    // If a locale is specified, check if it's available to reverse build from.
    const platformLocale: string = getLexLocale(
      this.$plugin.getPlatformPath(),
      this.$context.locales,
      this.$plugin.$config.locales,
    );
    if (this.$context.flags.locale && this.$context.flags.locale[0] !== platformLocale) {
      throw new JovoCliError(
        `Could not find platform models for locale: ${printHighlight(
          this.$context.flags.locale[0],
        )}`,
        this.$plugin.constructor.name,
        `Available locales include: ${platformLocale}`,
      );
    }

    // Try to resolve the locale according to the locale map provided in this.$plugin.$config.locales.
    let modelLocale: string = platformLocale;
    if (this.$plugin.$config.locales) {
      for (const locale in this.$plugin.$config.locales) {
        const resolvedLocales: string[] = getResolvedLocales(
          locale,
          SupportedLocales,
          this.$plugin.$config.locales,
        );

        if (resolvedLocales.includes(platformLocale)) {
          modelLocale = locale;
          break;
        }
      }
    }

    const reverseBuildTask: Task = new Task(`${REVERSE_ARROWS} Reversing model files`);
    // If Jovo model files for the current locales exist, ask whether to back them up or not.
    if (this.$cli.$project!.hasModelFiles([modelLocale]) && !this.$context.flags.force) {
      const answer = await promptOverwriteReverseBuild();
      if (answer.overwrite === ANSWER_CANCEL) {
        return;
      }
      if (answer.overwrite === ANSWER_OVERWRITE) {
        // Backup old files.
        const backupTask: Task = new Task('Creating backups', async () => {
          const localeTask: Task = new Task(modelLocale, () => {
            this.$cli.$project!.backupModel(modelLocale);
            console.log();
          });
          await localeTask.run();
        });
        reverseBuildTask.add(backupTask);
      }
    }
    const taskDetails: string = platformLocale === modelLocale ? '' : `(${modelLocale})`;
    const localeTask: Task = new Task(`${platformLocale} ${taskDetails}`, async () => {
      const lexModelFiles: NativeFileInformation[] = [
        {
          path: [],
          content: this.getLexModel(platformLocale),
        },
      ];
      const jovoModel = new JovoModelLex();
      jovoModel.importNative(lexModelFiles, modelLocale);
      const nativeData: JovoModelData | undefined = jovoModel.exportJovoModel();

      if (!nativeData) {
        throw new JovoCliError(
          'Something went wrong while exporting your Jovo model.',
          this.$plugin.constructor.name,
        );
      }
      this.$cli.$project!.saveModel(nativeData, modelLocale);
      await wait(500);
    });

    reverseBuildTask.add(localeTask);
    await reverseBuildTask.run();
  }

  /**
   * Loads a Jovo model specified by a locale and merges it with plugin-specific models.
   * @param locale - The locale that specifies which model to load.
   */
  getJovoModel(locale: string): JovoModelData {
    const model: JovoModelData = this.$cli.$project!.getModel(locale);

    // Merge model with configured language model in project.js.
    _mergeWith(
      model,
      this.$cli.$project!.$config.getParameter(`languageModel.${locale}`) || {},
      mergeArrayCustomizer,
    );
    // Merge model with configured, platform-specific language model in project.js.
    _mergeWith(
      model,
      _get(this.$plugin.$config, `options.languageModel.${locale}`, {}),
      mergeArrayCustomizer,
    );

    return model;
  }

  /**
   * Loads a Lex model, specified by a locale.
   * @param locale - Locale of the Lex model.
   */
  getLexModel(locale: string): JovoModelLexData {
    return require(joinPaths(this.$plugin.getPlatformPath(), locale));
  }
}
