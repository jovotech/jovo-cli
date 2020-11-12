import { cli as ux } from 'cli-ux';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmdirSync, writeFileSync } from 'fs';
import _merge from 'lodash.merge';
import _get from 'lodash.get';
import _mergeWith from 'lodash.mergewith';
import _set from 'lodash.set';
import _has from 'lodash.has';
import {
  Hook,
  Task,
  JovoCliPluginContext,
  JovoCliError,
  printStage,
  printSubHeadline,
  Project,
  promptOverwriteReverseBuild,
  ANSWER_CANCEL,
  ANSWER_BACKUP,
  STATION,
  OK_HAND,
  ParseEventArguments,
} from 'jovo-cli-core';
import { BuildEvents } from 'jovo-cli-command-build';
import { FileBuilder, FileObject } from 'filebuilder';
import { JovoModelAlexa, JovoModelAlexaData } from 'jovo-model-alexa';
import { JovoModelData, NativeFileInformation } from 'jovo-model';

import defaultFiles from '../utils/DefaultFiles.json';
import { getModelPath, getModelsPath, getPlatformDirectory, getPlatformPath } from '../utils/Paths';

const project: Project = Project.getInstance();

export class BuildHook extends Hook<BuildEvents> {
  install() {
    this.actionSet = {
      'parse': [this.checkForPlatform.bind(this)],
      'before.build': [this.validateModels.bind(this), this.checkForCleanBuild.bind(this)],
      'build': [this.build.bind(this)],
      'reverse.build': [this.buildReverse.bind(this)],
    };
  }

  checkForPlatform(args: ParseEventArguments) {
    // Check if this plugin should be used or not.
    if (args.flags.platform && args.flags.platform !== this.$config.pluginId!) {
      this.uninstall();
    }
  }

  async validateModels(ctx: JovoCliPluginContext) {
    // Validate Jovo model.
    const validationTask: Task = new Task(`${OK_HAND} Validating Alexa model files`);

    for (const locale of ctx.locales) {
      const localeTask = new Task(locale, async () => {
        project.validateModel(locale, JovoModelAlexa.getValidator());
        await ux.wait(500);
      });

      validationTask.add(localeTask);
    }

    await validationTask.run();
  }

  checkForCleanBuild(ctx: JovoCliPluginContext) {
    // If --clean has been set, delete the respective platform folders before building.
    if (ctx.flags.clean) {
      // @ts-ignore
      rmdirSync(getPlatformPath(), { recursive: true });
    }
  }

  async build(ctx: JovoCliPluginContext) {
    const taskStatus: string = project.hasPlatform(getPlatformDirectory())
      ? 'Updating'
      : 'Creating';

    const buildTaskTitle =
      `${STATION} ${taskStatus} Alexa Skill project files${printStage(project.getStage())}\n` +
      printSubHeadline(`Path: ./${project.getBuildDirectory()}${getPlatformDirectory()}`);

    // Define main build task.
    const buildTask: Task = new Task(buildTaskTitle);

    // Update or create Alexa project files, depending on whether it has already been built or not.
    const projectFilesTask: Task = new Task(
      `${taskStatus} Project Files`,
      this.createAlexaProjectFiles.bind(this, ctx),
    );

    const buildInteractionModelTask: Task = new Task(
      `${taskStatus} Interaction Model`,
      this.createInteractionModel(ctx),
    );
    // If no model files for the current locales exist, do not build interaction model.
    if (!project.hasModelFiles(ctx.locales)) {
      buildInteractionModelTask.disable();
    }

    buildTask.add(projectFilesTask, buildInteractionModelTask);

    await buildTask.run();
  }

  async buildReverse(ctx: JovoCliPluginContext) {
    // Since platform can be prompted for, check if this plugin should actually be executed again.
    if (!ctx.platforms.includes(this.$config.pluginId!)) {
      return;
    }
    // Get locales to reverse build from. If --locale is not specified, reverse build from every locale
    // available in the platform folder.
    const locales: string[] = [];
    if (ctx.locales.length > 1) {
      locales.push(...this.getPlatformLocales());
    } else {
      const locale: string | undefined = this.getPlatformLocales().find(
        (locale: string) => locale === ctx.locales[0],
      );

      // If the specified locale can't be found, throw an error.
      if (!locale) {
        throw new JovoCliError(
          `Could not find platform models for locale: ${locale}`,
          this.$config.name,
        );
      }

      locales.push(locale);
    }
    // If Jovo model files for the current locales exist, ask whether to back them up or not.
    if (project.hasModelFiles(locales) && !ctx.flags!.force) {
      const answer = await promptOverwriteReverseBuild();
      if (answer.overwrite === ANSWER_CANCEL) {
        return;
      }

      if (answer.overwrite === ANSWER_BACKUP) {
        // Backup old files.
        const backupTask: Task = new Task('Creating backups');
        for (const locale of locales) {
          const localeTask: Task = new Task(locale, () => project.backupModel(locale));
          backupTask.add(localeTask);
        }
        await backupTask.run();
      }
    }

    const reverseTask: Task = new Task('Reversing model files');

    for (const locale of locales) {
      const localeTask: Task = new Task(locale, async () => {
        const alexaModelFiles: NativeFileInformation[] = [
          {
            path: [],
            content: this.getPlatformModel(locale),
          },
        ];

        const jovoModel = new JovoModelAlexa();
        jovoModel.importNative(alexaModelFiles, locale);

        // Apply the changes to the current model-file if one exists
        let modelFile: JovoModelData;
        try {
          modelFile = project.getModel(locale);
        } catch (error) {
          // Currently no model file exists so there is
          // nothing to merge it with.
          modelFile = {
            invocation: '',
          };
        }
        const nativeData: JovoModelData | undefined = jovoModel.exportJovoModel();
        if (!nativeData) {
          throw new JovoCliError('Alexa files did not contain any valid data.', this.$config.name);
        }

        _merge(modelFile, nativeData);
        project.saveModel(modelFile, locale);
        await ux.wait(500);
      });
      reverseTask.add(localeTask);
    }

    await reverseTask.run();
  }

  /**
   * Builds the Alexa skill manifest.
   * @param ctx - JovoCliPluginContext, containing context-sensitive information such as what locales to use.
   */
  createAlexaProjectFiles(ctx: JovoCliPluginContext) {
    const files: FileObject = FileBuilder.normalizeFileObject(
      _get(this.$config, 'options.files', {}),
    );

    // If platforms folder doesn't exist, take default files and parse them with project.js config into FileBuilder.
    const projectFiles: FileObject = project.hasPlatform(getPlatformDirectory())
      ? files
      : _merge(defaultFiles, files);

    // Merge global project.js properties with platform files.
    const endpoint: string = this.getPluginEndpoint();
    const endpointPath: string = 'skill-package/["skill.json"].manifest.apis.custom.endpoint';
    // If a global endpoint is given and one is not already specified, set the global one.
    if (endpoint && !_has(projectFiles, endpointPath)) {
      // If endpoint is of type ARN, omit the Wildcard certificate.
      const certificate: string | null = !endpoint.startsWith('arn') ? 'Wildcard' : null;
      // Create basic HTTPS endpoint from Wildcard SSL.
      _set(projectFiles, endpointPath, {
        sslCertificateType: certificate,
        uri: endpoint,
      });
    }

    const skillId = _get(this.$config, 'options.skillId');
    const skillIdPath: string = '[".ask/"]["ask-states.json"].profiles.default.skillId';
    // Check whether skill id has already been set.
    if (skillId && !_has(projectFiles, skillIdPath)) {
      _set(projectFiles, skillIdPath, skillId);
    }

    const skillName: string = project.getProjectName();
    for (const locale of ctx.locales) {
      const buildLocales: string[] = [];
      // If locale is of format en, de, ..., try to get sublocales.
      if (locale.length === 2) {
        buildLocales.push(...this.getSubLocales(locale));
      }

      // If no sublocales have been found, just push the locale to buildLocales.
      if (!buildLocales.length) {
        buildLocales.push(locale);
      }

      for (const buildLocale of buildLocales) {
        // Check whether publishing information has already been set.
        const publishingInformationPath: string = `skill-package/["skill.json"].manifest.publishingInformation.locales.${buildLocale}`;
        if (!_has(projectFiles, publishingInformationPath)) {
          _set(projectFiles, publishingInformationPath, {
            summary: 'Sample Short Description',
            examplePhrases: ['Alexa open hello world'],
            keywords: ['hello', 'world'],
            name: skillName,
            description: 'Sample Full Description',
            smallIconUri: 'https://via.placeholder.com/108/09f/09f.png',
            largeIconUri: 'https://via.placeholder.com/512/09f/09f.png',
          });
        }

        const privacyAndCompliancePath: string = `skill-package/["skill.json"].manifest.privacyAndCompliance.locales.${buildLocale}`;
        // Check whether privacy and compliance information has already been set.
        if (!_has(projectFiles, privacyAndCompliancePath)) {
          _set(projectFiles, privacyAndCompliancePath, {
            privacyPolicyUrl: 'http://example.com/policy',
            termsOfUseUrl: '',
          });
        }
      }
    }

    FileBuilder.buildDirectory(projectFiles, getPlatformPath());
  }

  /**
   * Creates and returns tasks for each locale to build the interaction model for Alexa.
   * @param ctx - JovoCliPluginContext, containing context-sensitive information such as what locales to use.
   */
  createInteractionModel(ctx: JovoCliPluginContext): Task[] {
    const tasks: Task[] = [];
    for (const locale of ctx.locales) {
      const localeTask: Task = new Task(locale, async () => {
        this.buildLanguageModel(locale);
        await ux.wait(500);
      });

      tasks.push(localeTask);
    }

    return tasks;
  }

  /**
   * Returns the defined sub locales for the given locale,
   * e.g. en -> en-US, en-CA, ...
   *
   * @param {string} locale - The locale to return sub locales for.
   */
  getSubLocales(locale: string): string[] {
    const locales = _get(this.$config, `options.locales.${locale}`, []);

    if (!locales.length) {
      throw new JovoCliError(
        `Could not retrieve locales mapping for language "${locale}"!`,
        this.$config.name,
      );
    }

    return locales;
  }

  /**
   * Builds and saves Alexa Skill model from Jovo model.
   * @param {string} locale
   * @param {string} stage
   */
  buildLanguageModel(locale: string) {
    const model = this.getJovoModel(locale);

    const buildLocales: string[] = [];
    // If locale is of format en, de, ..., try to get sublocales.
    if (locale.length === 2) {
      buildLocales.push(...this.getSubLocales(locale));
    }

    // If no sublocales have been found, just push the locale to buildLocales.
    if (!buildLocales.length) {
      buildLocales.push(locale);
    }

    try {
      for (const buildLocale of buildLocales) {
        const jovoModel: JovoModelAlexa = new JovoModelAlexa(model, buildLocale);
        const alexaModelFiles: NativeFileInformation[] = jovoModel.exportNative() as NativeFileInformation[];

        if (!alexaModelFiles || !alexaModelFiles.length) {
          // Should actually never happen but who knows
          throw new JovoCliError(
            `Could not build Alexa files for locale "${buildLocale}"!`,
            'jovo-cli-platform-alexa',
          );
        }

        const modelsPath: string = getModelsPath();
        if (!existsSync(modelsPath)) {
          mkdirSync(modelsPath, { recursive: true });
        }

        writeFileSync(
          getModelPath(buildLocale),
          JSON.stringify(alexaModelFiles[0].content, null, 2),
        );
      }
    } catch (error) {
      // ToDo: Optimize!
      if (error instanceof JovoCliError) {
        throw error;
      }
      throw new JovoCliError(err.message, this.$config.name);
    }
  }

  /**
   * Get plugin-specific endpoint.
   */
  getPluginEndpoint(): string {
    const config = project.getConfig();
    const endpoint = _get(this.$config, 'options.endpoint') || _get(config, 'endpoint');

    return project.resolveEndpoint(endpoint);
  }

  /**
   * Loads a platform-specific model from .
   * @param locale - Locale of the model.
   */
  getPlatformModel(locale: string): JovoModelAlexaData {
    const content: string = readFileSync(getModelPath(locale), 'utf-8');
    return JSON.parse(content);
  }

  /**
   * Returns all locales for the current platform.
   */
  getPlatformLocales(): string[] {
    const files: string[] = readdirSync(getModelsPath());
    // Map each file to it's identifier, without file extension.
    return files.map((file: string) => {
      const localeRegex: RegExp = /(.*)\.(?:[^.]+)$/;
      const match = localeRegex.exec(file);

      // ToDo: Test!
      if (!match) {
        return file;
      }

      return match[1];
    });
  }

  /**
   * Loads a Jovo model specified by a locale and merges it with plugin-specific models.
   * @param locale - The locale that specifies which model to load.
   */
  getJovoModel(locale: string): JovoModelData {
    const model: JovoModelData = project.getModel(locale);

    // Create customizer to concat model arrays instead of overwriting them.
    const mergeCustomizer: Function = (objValue: any[], srcValue: any) => {
      // Since _.merge simply overwrites the original array, concatenate them instead.
      if (Array.isArray(objValue)) {
        return objValue.concat(srcValue);
      }
    };

    // Merge model with configured language model in project.js.
    _mergeWith(
      model,
      project.$configReader.getConfigParameter(`languageModel.${locale}`) || {},
      mergeCustomizer,
    );
    // Merge model with configured, platform-specific language model in project.js.
    _mergeWith(model, _get(this.$config, `options.languageModel.${locale}`, {}), mergeCustomizer);

    return model;
  }
}
