import { join as joinPaths, sep as pathSeperator } from 'path';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'fs';
import tv4 from 'tv4';
import { JovoModelData } from '@jovotech/model';

import { JovoCliError } from './JovoCliError';
import { Config } from './Config';
import { DEFAULT_LOCALE } from './constants';
import { JovoCliPlugin } from './JovoCliPlugin';

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
  getModelsDirectory(): string {
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
  async getModel(locale: string): Promise<JovoModelData> {
    try {
      const path: string = this.getModelPath(locale);
      // Require model file, so it works with both .js and .json.
      const content: JovoModelData | (() => Promise<JovoModelData>) = require(path);
      if (typeof content === 'function') {
        const builtContent = await content();
        return builtContent;
      }
      return content;
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      if (error.code === 'MODULE_NOT_FOUND') {
        throw new JovoCliError({ message: `Could not find model file for locale: ${locale}` });
      }

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      throw new JovoCliError(error.message);
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
      const path: string = this.getModelPath(locale);
      if (!existsSync(`${path}.js`) && !existsSync(`${path}.json`)) {
        return false;
      }
    }
    return true;
  }

  async validateModel(locale: string, validator: tv4.JsonSchema): Promise<void> {
    const model: JovoModelData = await this.getModel(locale);

    if (!tv4.validate(model, validator)) {
      throw new JovoCliError({
        message: `Validation failed for locale "${locale}"`,
        details: tv4.error.message,
        learnMore: tv4.error.dataPath ? `Path: ${tv4.error.dataPath}` : '',
      });
    }
  }

  /**
   * Backs up model file.
   * @param locale - Locale of the model file.
   */
  backupModel(locale: string): void {
    if (!this.hasModelFiles([locale])) {
      throw new JovoCliError({
        message: `Model file for locale ${locale} to backup could not be found.`,
      });
    }

    const todayDate: Date = new Date();
    const todayString: string = todayDate.toISOString().substring(0, 10);
    const modelPath: string = this.getModelPath(locale);

    // Try to copy model file for either .json or .js.
    const fileExtensions: string[] = ['json', 'js'];
    for (const ext of fileExtensions) {
      const targetPath = `${modelPath}.${ext}`;
      if (!existsSync(targetPath)) {
        continue;
      }

      const destinationFile = `${modelPath}.${todayString}.${ext}`;
      copyFileSync(targetPath, destinationFile);
    }
  }

  /**
   * Saves model to file.
   * @param model - Model to save.
   * @param locale - Locale to save the model under.
   */
  saveModel(model: JovoModelData, locale: string): void {
    const modelsPath: string = this.getModelsPath();
    if (!existsSync(modelsPath)) {
      mkdirSync(modelsPath);
    }

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
    const localeRegex = /^([a-z]{2}(?:-?(?:[A-Z]{2})?)).(?:json|js)$/m;
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

    for (const plugin of projectPlugins) {
      plugins.push(plugin);
    }

    return plugins;
  }
}
