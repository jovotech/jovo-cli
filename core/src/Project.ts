import { join as joinPaths, sep as pathSeperator } from 'path';
import _cloneDeep from 'lodash.clonedeep';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'fs';
import tv4 from 'tv4';
import _get from 'lodash.get';
import _merge from 'lodash.merge';
import { JovoModelData, ModelValidationError } from 'jovo-model';

import { JovoCliError } from './JovoCliError';
import { Config } from './Config';
import { DEFAULT_LOCALE } from './utils/Constants';
import { JovoCliPlugin } from './JovoCliPlugin';
import { PluginConfig } from './utils/Interfaces';

export class Project {
  private static instance?: Project;

  private projectPath: string;

  readonly $config: Config;
  readonly $stage?: string;

  constructor(projectPath: string) {
    this.projectPath = projectPath;

    // Look for --stage in process.argv.
    const stageIndex: number = process.argv.findIndex((el) => el === '--stage');
    // If a flag --stage has been set, set it to this.jovoStage. Otherwise intialize default stage.
    if (stageIndex > -1) {
      this.$stage = process.argv[stageIndex + 1];
    } else {
      if (process.env.JOVO_STAGE) {
        this.$stage = process.env.JOVO_STAGE;
      } else if (process.env.NODE_ENV) {
        this.$stage = process.env.NODE_ENV;
      }
    }

    this.$config = Config.getInstance(this.projectPath, this.$stage);

    // If stage was not explicitly defined, try to get it from config.
    if (!this.$stage) {
      this.$stage = this.$config.getParameter('defaultStage') as string | undefined;
    }
  }

  /**
   * Returns singleton project instance.
   * @param projectPath - Current project path.
   */
  static getInstance(projectPath: string): Project {
    if (!this.instance) {
      this.instance = new Project(projectPath);
    }

    return this.instance;
  }

  /**
   * Returns directory name for build folder.
   * @param stage - Optional config stage.
   */
  getBuildDirectory(): string {
    return (this.$config.getParameter('buildDirectory') as string) || 'build';
  }

  /**
   * Returns path to build folder.
   */
  getBuildPath(): string {
    return joinPaths(this.projectPath, this.getBuildDirectory());
  }

  /**
   * Returns directory name for models folder.
   * @param stage - Optional config stage.
   */
  getModelsDirectory() {
    return (this.$config.getParameter('modelsDirectory') as string) || 'models';
  }

  /**
   * Returns path to Jovo model files.
   */
  getModelsPath(): string {
    return joinPaths(this.projectPath, this.getModelsDirectory());
  }

  /**
   * Returns the path for a specific Jovo model.
   * @param locale - The locale under which the Jvoo model is stored.
   */
  getModelPath(locale: string): string {
    return joinPaths(this.getModelsPath(), locale);
  }

  /**
   * Requires and returns Jovo model for the provided locale.
   * @param locale - Locale under which the Jovo model is stored.
   */
  getModel(locale: string): JovoModelData {
    try {
      const path: string = this.getModelPath(locale);
      // Require model file, so it works with both .js and .json.
      const content: JovoModelData = require(path);
      return content;
    } catch (error) {
      if (error.code === 'MODULE_NOT_FOUND') {
        throw new JovoCliError(`Could not find model file for locale: ${locale}`, '@jovotech/cli-core');
      }

      throw new JovoCliError(error.message, '@jovotech/cli-core');
    }
  }

  /**
   * Checks if model files for given locales exist.
   * @param locales - Locales for which to check.
   */
  hasModelFiles(locales?: string[]): boolean {
    if (!locales) {
      return false;
    }

    // If at least one model does not exist for a given locale, return false.
    for (const locale of locales) {
      try {
        this.getModel(locale);
      } catch (error) {
        return false;
      }
    }
    return true;
  }

  validateModel(locale: string, validator: tv4.JsonSchema) {
    const model: JovoModelData = this.getModel(locale);

    if (!tv4.validate(model, validator)) {
      throw new ModelValidationError(tv4.error.message, locale, tv4.error.dataPath);
    }
  }

  /**
   * Backs up model file.
   * @param locale - Locale of the model file.
   */
  backupModel(locale: string) {
    if (!this.hasModelFiles([locale])) {
      throw new JovoCliError(
        `Model file for locale ${locale} to backup could not be found.`,
        '@jovotech/cli-core',
      );
    }

    const todayDate: Date = new Date();
    const todayString: string = todayDate.toISOString().substring(0, 10);
    const modelPath: string = this.getModelPath(locale);

    // Try to copy model file for either .json or .js.
    const fileExtensions: string[] = ['json', 'js'];
    for (const ext of fileExtensions) {
      const targetPath: string = `${modelPath}.${ext}`;
      if (!existsSync(targetPath)) {
        continue;
      }

      const destinationFile: string = `${modelPath}.${todayString}.${ext}`;
      copyFileSync(targetPath, destinationFile);
    }
  }

  /**
   * Saves model to file.
   * @param model - Model to save.
   * @param locale - Locale to save the model under.
   */
  saveModel(model: JovoModelData, locale: string) {
    const modelsPath: string = this.getModelsPath();
    if (!existsSync(modelsPath)) {
      mkdirSync(modelsPath);
    }

    // Check if model file is json or JavaScript
    const modelFilePath = `${this.getModelPath(locale)}.json`;

    writeFileSync(modelFilePath, JSON.stringify(model, null, 2));
  }

  /**
   * Returns project locales from Jovo models folder.
   */
  getLocales(): string[] {
    if (!existsSync(this.getModelsPath())) {
      return [DEFAULT_LOCALE];
    }

    const files: string[] = readdirSync(this.getModelsPath());

    // If models folder doesn't contain any files, return default locale.
    if (!files.length) {
      return [DEFAULT_LOCALE];
    }

    // RegExp to match all locale files in format of en.json or en-US.json.
    const localeRegex: RegExp = /^([a-z]{2}(?:-?(?:[A-Z]{2})?)).(?:json|js)$/m;
    return files.reduce((locales: string[], file: string) => {
      const match = localeRegex.exec(file);

      if (match) {
        locales.push(match[1]);
      }

      return locales;
    }, []);
  }

  /**
   * Returns project name extracted from project path.
   */
  getProjectName(): string {
    return this.projectPath.split(pathSeperator).pop() as string;
  }

  /**
   * Returns true, if project has a platform folder in build path.
   * @param platformDir - The platform to look up inside the build folder.
   */
  hasPlatform(platformDir: string): boolean {
    return existsSync(joinPaths(this.getBuildPath(), platformDir));
  }

  /**
   * Checks if the project is a typescript project.
   */
  isTypeScriptProject(): boolean {
    const packagePath: string = joinPaths(this.projectPath, 'package.json');
    const content: string = readFileSync(packagePath).toString();
    const packageFile = JSON.parse(content);

    return (
      packageFile.hasOwnProperty('devDependencies') &&
      packageFile.devDependencies.hasOwnProperty('typescript')
    );
  }

  collectPlugins(): JovoCliPlugin[] {
    const plugins: JovoCliPlugin[] = [];

    const projectPlugins: JovoCliPlugin[] =
      (this.$config.getParameter('plugins') as JovoCliPlugin[]) || [];

    // ToDo: Check if plugin is instance of JovoCliPlugin.
    for (const plugin of projectPlugins) {
      // Get plugin id, name and type from plugin instance and merge them into plugin config.
      const pluginConfig: PluginConfig = {
        pluginId: plugin.id,
        pluginName: plugin.constructor.name,
        pluginType: plugin.type,
      };
      _merge(plugin.config, pluginConfig);
      plugins.push(plugin);
    }
    return plugins;
  }
}
