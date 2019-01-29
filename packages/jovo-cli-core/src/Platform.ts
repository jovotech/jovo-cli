import { AppFile, JovoCliDeploy, JovoModel, JovoTaskContext, Project } from './';
import { ListrTask } from 'listr';
import * as path from 'path';
import * as inquirer from 'inquirer';
import Vorpal = require('vorpal');
import { ArgOptions } from './Interfaces';


const project = require('./Project').getProject();


export class JovoCliPlatform {

	static PLATFORM_KEY = '';

	constructor() {
	}


	// START: Methods which need to get implemented by platfrom modules


	/**
	 * Return platfrom specific config id
	 *
	 * @param {Project} project The project
	 * @param {ArgOptions} [argOptions] CLI arguments
	 * @returns {object}
	 * @memberof JovoCliPlatform
	 */
	getPlatformConfigIds(project: Project, argOptions: ArgOptions): object {
		// @ts-ignore
		throw new Error(`Method "getPlatformConfigIds" is not implemented for platform "${this.constructor.PLATFORM_KEY}"!`);
	}


	/**
	 * Return platfrom specific platfrom values
	 *
	 * @param {Project} project The project
	 * @param {ArgOptions} [argOptions] CLI arguments
	 * @returns {object}
	 * @memberof JovoCliPlatform
	 */
	getPlatformConfigValues(project: Project, argOptions: ArgOptions): object {
		// @ts-ignore
		throw new Error(`Method "getPlatformConfigValues" is not implemented for platform "${this.constructor.PLATFORM_KEY}"!`);
	}


	/**
	 * Returns existing projects of user
	 *
	 * @param {AppFile} config Configuration file
	 * @returns {Promise<object>}
	 * @memberof JovoCliPlatform
	 */
	getExistingProjects(config: AppFile): Promise<inquirer.ChoiceType[]> {
		// @ts-ignore
		throw new Error(`Method "getExistingProjects" is not implemented for platform "${this.constructor.PLATFORM_KEY}"!`);
	}



	// ----------------------------------------------
	// CLI Options
	// ----------------------------------------------

	getAdditionalCliOptions(command: string, vorpalCommand: Vorpal.Command): void {
		// @ts-ignore
		throw new Error(`Method "getAdditionalCliOptions" is not implemented for platform "${this.constructor.PLATFORM_KEY}"!`);
	}


	validateAdditionalCliOptions(command: string, args: Vorpal.Args): boolean {
		// @ts-ignore
		throw new Error(`Method "validateAdditionalCliOptions" is not implemented for platform "${this.constructor.PLATFORM_KEY}"!`);
	}



	getLocales(locale?: string | string[]): string[] {
		// @ts-ignore
		throw new Error(`Method "getLocales" is not implemented for platform "${this.constructor.PLATFORM_KEY}"!`);
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
		// @ts-ignore
		throw new Error(`Method "getBuildReverseTasks" is not implemented for platform "${this.constructor.PLATFORM_KEY}"!`);
	}



	/**
	 * Gets tasks to build platform specific language model
	 *
	 * @param {JovoTaskContext} ctx The Context
	 * @returns {ListrTask[]}
	 * @memberof JovoCliPlatform
	 */
	getBuildTasks(ctx: JovoTaskContext): ListrTask[] {
		// @ts-ignore
		throw new Error(`Method "getBuildTasks" is not implemented for platform "${this.constructor.PLATFORM_KEY}"!`);
	}


	/**
	 * Get tasks to deploy project
	 *
	 * @param {JovoTaskContext} ctx The Context
	 * @param {JovoCliDeploy[]} targets The additional deploy targets
	 * @returns {ListrTask[]}
	 * @memberof JovoCliPlatform
	 */
	getDeployTasks(ctx: JovoTaskContext, targets: JovoCliDeploy[]): ListrTask[] {
		// @ts-ignore
		throw new Error(`Method "getDeployTasks" is not implemented for platform "${this.constructor.PLATFORM_KEY}"!`);
	}


	/**
	 * Get tasks to get existing platform project
	 *
	 * @param {JovoTaskContext} ctx The Context
	 * @returns {ListrTask[]}
	 * @memberof JovoCliPlatform
	 */
	getGetTasks(ctx: JovoTaskContext): ListrTask[] {
		// @ts-ignore
		throw new Error(`Method "getGetTasks" is not implemented for platform "${this.constructor.PLATFORM_KEY}"!`);
	}




	/**
	 * Returns if project already contains platform
	 *
	 * @returns {boolean}
	 * @memberof JovoCliPlatform
	 */
	hasPlatform(): boolean {
		// @ts-ignore
		throw new Error(`Method "hasPlatform" is not implemented for platform "${this.constructor.PLATFORM_KEY}"!`);
	}



	/**
	 * Set platform defaults on model
	 *
	 * @param {JovoModel} model The model to set the data on
	 * @returns {JovoModel}
	 * @memberof JovoCliPlatform
	 */
	setPlatformDefaults(model: JovoModel): JovoModel {
		// @ts-ignore
		throw new Error(`Method "setPlatformDefaults" is not implemented for platform "${this.constructor.PLATFORM_KEY}"!`);
	}


	/**
	 * Add platform to configuration file
	 *
	 * @param {AppFile} config
	 * @returns {AppFile}
	 * @memberof JovoCliPlatform
	 */
	addPlatfromToConfig(config: AppFile): AppFile {
		// @ts-ignore
		throw new Error(`Method "addPlatfromToConfig" is not implemented for platform "${this.constructor.PLATFORM_KEY}"!`);
	}


	/**
	 * Validate the platform specific properties on model
	 *
	 * @param {JovoModel} model The model to validate
	 * @memberof JovoCliPlatform
	 */
	validateModel(model: JovoModel): void {
		// @ts-ignore
		throw new Error(`Method "validateModel" is not implemented for platform "${this.constructor.PLATFORM_KEY}"!`);
	}


	/**
	 * Returns the validator to check if the platform specific properties are valid
	 *
	 * @returns {tv4.JsonSchema}
	 * @memberof JovoCliPlatform
	 */
	getModelValidator(): tv4.JsonSchema {
		// @ts-ignore
		throw new Error(`Method "getModelValidator" is not implemented for platform "${this.constructor.PLATFORM_KEY}"!`);
	}


	// END: Methods which need to get implemented by platfrom modules



	/**
	 * Returns base path to platform
	 *
	 * @returns {string}
	 * @memberof JovoCliPlatform
	 */
	getPath(): string {
		// @ts-ignore
		return path.join(project.getProjectPath(), 'platforms', this.constructor.PLATFORM_KEY);
	}
}
