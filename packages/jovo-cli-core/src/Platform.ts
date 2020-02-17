import { AppFile, JovoCliDeploy, JovoTaskContext, Project } from './';
import { ListrTask } from 'listr';
import * as path from 'path';
import * as inquirer from 'inquirer';
import { JovoModelData } from 'jovo-model';
import { InputFlags, OutputFlags } from './Interfaces';

const project = require('./Project').getProject();

export class JovoCliPlatform {
	static PLATFORM_KEY = '';
	static ID_KEY = '';

	// START: Methods which need to get implemented by platform modules

	/**
	 * Return platform specific config id
	 *
	 * @param {Project} project The project
	 * @param {ArgOptions} [argOptions] CLI arguments
	 * @returns {object}
	 * @memberof JovoCliPlatform
	 */
	getPlatformConfigIds(project: Project, options: OutputFlags): object {
		throw new Error(
			// @ts-ignore
			`Method "getPlatformConfigIds" is not implemented for platform "${this.constructor.PLATFORM_KEY}"!`
		);
	}

	/**
	 * Return platform specific platform values
	 *
	 * @param {Project} project The project
	 * @param {ArgOptions} [argOptions] CLI arguments
	 * @returns {object}
	 * @memberof JovoCliPlatform
	 */
	getPlatformConfigValues(project: Project, options: OutputFlags): object {
		throw new Error(
			// @ts-ignore
			`Method "getPlatformConfigValues" is not implemented for platform "${this.constructor.PLATFORM_KEY}"!`
		);
	}

	/**
	 * Returns existing projects of user
	 *
	 * @param {AppFile} config Configuration file
	 * @returns {Promise<object>}
	 * @memberof JovoCliPlatform
	 */
	getExistingProjects(config: AppFile): Promise<inquirer.ChoiceType[]> {
		throw new Error(
			// @ts-ignore
			`Method "getExistingProjects" is not implemented for platform "${this.constructor.PLATFORM_KEY}"!`
		);
	}

	// ----------------------------------------------
	// CLI Options
	// ----------------------------------------------

	getAdditionalCliOptions(command: string, options: InputFlags): void {
		throw new Error(
			// @ts-ignore
			`Method "getAdditionalCliOptions" is not implemented for platform "${this.constructor.PLATFORM_KEY}"!`
		);
	}

	validateAdditionalCliOptions(
		command: string,
		options: OutputFlags
	): boolean {
		throw new Error(
			// @ts-ignore
			`Method "validateAdditionalCliOptions" is not implemented for platform "${this.constructor.PLATFORM_KEY}"!`
		);
	}

	getLocales(locale?: string | string[]): string[] {
		throw new Error(
			// @ts-ignore
			`Method "getLocales" is not implemented for platform "${this.constructor.PLATFORM_KEY}"!`
		);
	}

	// ----------------------------------------------
	// Tasks
	// ----------------------------------------------

	/**
	 * Get tasks to build Jovo language model from platform
	 * specific language model
	 *
	 * @param {JovoTaskContext} ctx The Context
	 * @returns {ListrTask[]}
	 * @memberof JovoCliPlatform
	 */
	getBuildReverseTasks(ctx: JovoTaskContext): ListrTask[] {
		throw new Error(
			// @ts-ignore
			`Method "getBuildReverseTasks" is not implemented for platform "${this.constructor.PLATFORM_KEY}"!`
		);
	}

	/**
	 * Gets tasks to build platform specific language model
	 *
	 * @param {JovoTaskContext} ctx The Context
	 * @returns {ListrTask[]}
	 * @memberof JovoCliPlatform
	 */
	getBuildTasks(ctx: JovoTaskContext): ListrTask[] {
		throw new Error(
			// @ts-ignore
			`Method "getBuildTasks" is not implemented for platform "${this.constructor.PLATFORM_KEY}"!`
		);
	}

	/**
	 * Get tasks to deploy project
	 *
	 * @param {JovoTaskContext} ctx The Context
	 * @param {JovoCliDeploy[]} targets The additional deploy targets
	 * @returns {ListrTask[]}
	 * @memberof JovoCliPlatform
	 */
	getDeployTasks(
		ctx: JovoTaskContext,
		targets: JovoCliDeploy[]
	): ListrTask[] {
		throw new Error(
			// @ts-ignore
			`Method "getDeployTasks" is not implemented for platform "${this.constructor.PLATFORM_KEY}"!`
		);
	}

	/**
	 * Get tasks to get existing platform project
	 *
	 * @param {JovoTaskContext} ctx The Context
	 * @returns {ListrTask[]}
	 * @memberof JovoCliPlatform
	 */
	getGetTasks(ctx: JovoTaskContext): ListrTask[] {
		throw new Error(
			// @ts-ignore
			`Method "getGetTasks" is not implemented for platform "${this.constructor.PLATFORM_KEY}"!`
		);
	}

	/**
	 * Returns if project already contains platform
	 *
	 * @returns {boolean}
	 * @memberof JovoCliPlatform
	 */
	hasPlatform(): boolean {
		throw new Error(
			// @ts-ignore
			`Method "hasPlatform" is not implemented for platform "${this.constructor.PLATFORM_KEY}"!`
		);
	}

	/**
	 * Set platform defaults on model
	 *
	 * @param {JovoModelData} model The model to set the data on
	 * @returns {JovoModel}
	 * @memberof JovoCliPlatform
	 */
	setPlatformDefaults(model: JovoModelData): JovoModelData {
		throw new Error(
			// @ts-ignore
			`Method "setPlatformDefaults" is not implemented for platform "${this.constructor.PLATFORM_KEY}"!`
		);
	}

	/**
	 * Add platform to configuration file
	 *
	 * @param {AppFile} config
	 * @returns {AppFile}
	 * @memberof JovoCliPlatform
	 */
	addPlatformToConfig(config: AppFile): AppFile {
		throw new Error(
			// @ts-ignore
			`Method "addPlatformToConfig" is not implemented for platform "${this.constructor.PLATFORM_KEY}"!`
		);
	}

	/**
	 * Validate the platform specific properties on model
	 *
	 * @param {JovoModelData} model The model to validate
	 * @memberof JovoCliPlatform
	 */
	validateModel(model: JovoModelData): void {
		throw new Error(
			// @ts-ignore
			`Method "validateModel" is not implemented for platform "${this.constructor.PLATFORM_KEY}"!`
		);
	}

	/**
	 * Returns the validator to check if the platform specific properties are valid
	 *
	 * @returns {tv4.JsonSchema}
	 * @memberof JovoCliPlatform
	 */
	getModelValidator(): tv4.JsonSchema {
		throw new Error(
			// @ts-ignore
			`Method "getModelValidator" is not implemented for platform "${this.constructor.PLATFORM_KEY}"!`
		);
	}

	// END: Methods which need to get implemented by platfrom modules

	/**
	 * Returns base path to platform
	 *
	 * @returns {string}
	 * @memberof JovoCliPlatform
	 */
	getPath(): string {
		return path.join(
			project.getProjectPath(),
			'platforms',
			// @ts-ignore
			this.constructor.PLATFORM_KEY
		);
	}
}
