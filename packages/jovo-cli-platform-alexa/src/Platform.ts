'use strict';


const AlexaInteractionModel = require('./AlexaInteractionModel').AlexaInteractionModel;
import * as _ from 'lodash';
import * as inquirer from 'inquirer';
import Vorpal = require('vorpal');
import * as fs from 'fs';
import * as path from 'path';
import * as ask from './Ask';
import { AppFile, ArgOptions, Intent, JovoCliDeploy, JovoModel, JovoCliPlatform, Project, TARGET_ALL, TARGET_INFO, TARGET_MODEL, Utils } from 'jovo-cli-core';
import * as listr from 'listr';
import { ListrTask, ListrTaskWrapper } from 'listr';
import { AlexaLMTypeValue, AlexaLMIntent, AppFileAlexa, JovoModelAlexa, JovoTaskContextAlexa } from '.';


const highlight = require('chalk').white.bold;

const project = require('jovo-cli-core').getProject();


export class JovoCliPlatformAlexa extends JovoCliPlatform {

	static PLATFORM_KEY = 'alexaSkill';

	constructor() {
		super();
	}


	/**
	 * Return platfrom specific config id
	 *
	 * @param {Project} project The project
	 * @param {ArgOptions} [argOptions] CLI arguments
	 * @returns {object}
	 * @memberof JovoCliPlatform
	 */
	getPlatformConfigIds(project: Project, argOptions: ArgOptions): object {
		try {
			let skillId;
			if (argOptions && argOptions.hasOwnProperty('skill-id') && argOptions['skill-id']) {
				skillId = argOptions['skill-id'];
			} else {
				skillId = project.getConfigParameter('alexaSkill.skillId', argOptions && argOptions.stage) || this.getSkillId();
			}

			const returnValue = {};
			if (skillId) {
				// @ts-ignore
				returnValue.skillId = skillId;
			}

			return returnValue;
		} catch (error) {
			return {};
		}
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

		let askProfile;
		if (argOptions && argOptions.hasOwnProperty('ask-profile') && argOptions['ask-profile']) {
			askProfile = argOptions['ask-profile'];
		}

		return {
			askProfile: askProfile ||
				project.getConfigParameter('alexaSkill.ask-profile', argOptions && argOptions.stage) ||
				project.getConfigParameter('alexaSkill.askProfile', argOptions && argOptions.stage) ||
				project.getConfigParameter('host.lambda.ask-Profile', argOptions && argOptions.stage) ||
				project.getConfigParameter('host.lambda.askProfile', argOptions && argOptions.stage) ||
				ask.DEFAULT_ASK_PROFILE,
		};
	}


	/**
	 * Returns existing projects of user
	 *
	 * @param {AppFile} config Configuration file
	 * @returns {Promise<object>}
	 * @memberof JovoCliPlatform
	 */
	getExistingProjects(config: JovoTaskContextAlexa): Promise<inquirer.ChoiceType[]> {
		return ask.checkAsk()
			.then(() => ask.askApiListSkills(config));
	}


	getAdditionalCliOptions(command: string, vorpalCommand: Vorpal.Command): void {
		if (command === 'get') {
			vorpalCommand
				.option('-s, --skill-id <skillId>',
					'Alexa Skill ID');
		}
		if (['build', 'deploy', 'get', 'init', 'new'].includes(command)) {
			vorpalCommand
				.option('--ask-profile <askProfile>',
					'Name of use ASK profile \n\t\t\t\tDefault: default');
		}
	}

	validateAdditionalCliOptions(command: string, args: Vorpal.Args): boolean {
		if (['build', 'deploy', 'get', 'init', 'new'].includes(command)) {
			return this.isValidAskProfile(args.options['ask-profile']);
		}

		return true;
	}


	/**
	 * Returns true if project has alexa skill files
	 *
	 * @returns {boolean}
	 * @memberof JovoCliPlatformAlexa
	 */
	hasPlatform(): boolean {
		try {
			const filePath = this.getSkillJsonPath();
			require(filePath);
			return true;
		} catch (err) {
			return false;
		}
	}


	/**
	 * Set platform defaults on model
	 *
	 * @param {JovoModel} model The model to set the data on
	 * @returns {JovoModel}
	 * @memberof JovoCliPlatform
	 */
	setPlatformDefaults(model: JovoModelAlexa): JovoModel {

		if (_.get(model, 'alexa.interactionModel.languageModel.intents')) {
			const result = _.unionBy(_.get(model, 'alexa.interactionModel.languageModel.intents'), this.getDefaultIntents(), 'name');
			_.set(model, 'alexa.interactionModel.languageModel.intents', result);
		} else {
			_.set(model, 'alexa.interactionModel.languageModel.intents', this.getDefaultIntents());
		}

		// let jovoIntent: AlexaLMTypeValue;
		let jovoIntent: Intent;
		if (model.intents) {
			for (jovoIntent of model.intents) {
				if (_.get(jovoIntent, 'alexa.name')) {
					_.remove(_.get(model, 'alexa.interactionModel.languageModel.intents'), (currentObject: AlexaLMIntent) => {
						// @ts-ignore
						return currentObject.name === jovoIntent.alexa.name;
					});
				}
			}
		}

		if (_.get(model, 'alexa.interactionModel.languageModel.intents').length === 0) {
			// @ts-ignore
			delete model.alexa.interactionModel.languageModel.intents;

			if (_.keys(_.get(model, 'alexa.interactionModel.languageModel')).length === 0) {
				// @ts-ignore
				delete model.alexa.interactionModel.languageModel;
			}
			if (_.keys(_.get(model, 'alexa.interactionModel')).length === 0) {
				// @ts-ignore
				delete model.alexa['interactionModel'];
			}
			if (_.keys(_.get(model, 'alexa')).length === 0) {
				delete model.alexa;
			}
		}

		return model;
	}


	/**
	 * Add Alexa to configuration file
	 *
	 * @param {AppFile} config
	 * @returns {AppFile}
	 * @memberof JovoCliPlatform
	 */
	addPlatfromToConfig(config: AppFileAlexa): AppFileAlexa {
		if (!config.alexaSkill) {
			_.extend(config, {
				alexaSkill: {
					nlu: {
						name: 'alexa',
					},
				},
			});
		}

		return config;
	}



	/**
	 * Checks validity of ask profile
	 * @param {string} askProfile
	 * @return {boolean}
	 */
	isValidAskProfile(askProfile: string): boolean {
		if (askProfile) {
			if (askProfile.length === 0) {
				console.log('--ask profile cannot be empty');
				return false;
			}
		}
		return true;
	}


    /**
     * Default Alexa Intents
     *
     * @returns {Array<object>}
     * @memberof Platform
     */
	getDefaultIntents(): Intent[] {
		return [
			{
				'name': 'AMAZON.CancelIntent',
				'samples': [

				],
			},
			{
				'name': 'AMAZON.HelpIntent',
				'samples': [

				],
			},
			{
				'name': 'AMAZON.StopIntent',
				'samples': [

				],
			},
		];
	}


	/**
	 * Gets tasks to build platform specific language model
	 *
	 * @param {JovoTaskContextAlexa} ctx The Context
	 * @returns {ListrTask[]}
	 * @memberof JovoCliPlatform
	 */
	getBuildTasks(ctx: JovoTaskContextAlexa): ListrTask[] {

		let title = 'Creating /platforms/alexaSkill ' + Utils.printStage(ctx.stage);

		const hasAlexaSkill = this.hasPlatform();

		if (hasAlexaSkill) {
			title = 'Updating /platforms/alexaSkill ' + Utils.printStage(ctx.stage);
		}

		const buildPlatformTasks: ListrTask[] = [];

		buildPlatformTasks.push({
			title,
			task: () => {
				let titleInteractionModel = 'Creating Alexa Interaction Model based on Jovo Language Model in ' + highlight('/models');
				if (hasAlexaSkill) {
					titleInteractionModel = 'Updating Alexa Interaction Model based on Jovo Language Model in ' + highlight('/models');
				}

				return new listr([
					{
						title: 'Creating Alexa project files',
						enabled: () => !hasAlexaSkill,
						task: () => {
							return new listr([
								{
									title: 'skill.json',
									task: (ctx, task) => {
										return this.createAlexaSkill(ctx)
											.then(() => {
												if (ctx.invocation) {
													return project.updateInvocation(
														ctx.invocation,
														ctx.locales[0]
													);
												}
												return Promise.resolve();
											})
											.then(() => this.buildSkillAlexa(ctx.stage))
											.then(() => Utils.wait(500));
									},
								},
							]);
						},
					},
					{
						title: 'Updating Alexa project files',
						enabled: () => hasAlexaSkill,
						task: () => {
							return new listr([
								{
									title: 'skill.json',
									task: (ctx, task) => {
										return this.buildSkillAlexa(ctx.stage)
											.then(() => Utils.wait(500));
									},
								},
							]);
						},
					}, {
						title: titleInteractionModel,
						enabled: () => project.hasModelFiles(ctx.locales),
						task: (ctx) => {
							const buildLocalesTasks: ListrTask[] = [];
							// throw new Error(JSON.stringify(ctx.locales))
							for (const locale of ctx.locales) {
								buildLocalesTasks.push({
									title: locale,
									task: () => {
										return this.buildLanguageModelAlexa(locale, ctx.stage)
											.then(() => {
													// Refresh the model data else it uses the old previously cached one
													this.getModel(locale, true);
													return Utils.wait(500);
												}
											);
									},
								});
							}
							return new listr(buildLocalesTasks);
						},
					}]);
			},
		});

		return buildPlatformTasks;
	}




	/**
	 * Get tasks to get existing platform project
	 *
	 * @param {JovoTaskContextAlexa} ctx The Context
	 * @returns {ListrTask[]}
	 * @memberof JovoCliPlatform
	 */
	getGetTasks(ctx: JovoTaskContextAlexa): ListrTask[] {

		const alexaSkillPath = this.getPath();
		if (!fs.existsSync(alexaSkillPath)) {
			fs.mkdirSync(alexaSkillPath);
		}

		return [
			{
				title: 'Getting Alexa Skill project for ASK profile ' + highlight(ctx.askProfile),
				enabled: (ctx) => ctx.target === TARGET_ALL || ctx.target === TARGET_INFO,
				task: (ctx, task) => {
					let p = Promise.resolve();
					ctx.info = 'Info: ';

					p = p
						.then(() => ask.checkAsk())
						.then(() => ask.askApiGetSkill(
							ctx, this.getSkillJsonPath()))
						.then(() => this.setAlexaSkillId(ctx.skillId))
						.then(() => ask.askApiGetAccountLinking(ctx))
						.then((accountLinkingJson) => {
							if (accountLinkingJson) {
								fs.writeFile(this.getAccountLinkingPath(),
									accountLinkingJson, (err) => {
										if (err) {
											return Promise.reject(err);
										}
										ctx.info += 'Account Linking Information saved to ' + this.getAccountLinkingPath();
										return Promise.resolve();
									});
							} else {
								return Promise.resolve();
							}
						}).then(() => {
							let info = 'Info: ';
							const skillInfo = this.getSkillSimpleInformation();
							info += `Skill Name: ${skillInfo.name}
Skill ID: ${skillInfo.skillId}
Endpoint: ${skillInfo.endpoint}`;
							task.skip(info);
						});
					return p;
				},
			},
			{
				title: 'Getting Alexa Skill model files and saving to /platforms/alexaSkill/models',
				enabled: (ctx) => ctx.target === TARGET_ALL ||
					ctx.target === TARGET_MODEL,
				task: (ctx) => {

					const alexaModelPath = this.getModelsPath();
					if (!fs.existsSync(alexaModelPath)) {
						fs.mkdirSync(alexaModelPath);
					}
					const skillJson = this.getSkillJson();

					let locales = Object.keys(
						skillJson.manifest.publishingInformation.locales);

					if (ctx.locale && ctx.target === TARGET_MODEL) {
						locales = [ctx.locale];
					}

					const getLocaleSubtasks: ListrTask[] = [];
					for (const locale of locales) {
						getLocaleSubtasks.push({
							title: locale,
							task: (ctx) => {
								return ask.askApiGetModel(
									ctx,
									this.getModelPath(locale),
									locale
								);
							},
						});
					}
					return new listr(getLocaleSubtasks);
				},
			},
		];
	}


	/**
	 * Get tasks to build JOVO language model from platform
	 * specific language model
	 *
	 * @param {JovoTaskContextAlexa} ctx The Context
	 * @returns {ListrTask[]}
	 * @memberof JovoCliPlatform
	 */
	getBuildReverseTasks(ctx: JovoTaskContextAlexa): ListrTask[] {

		const returnTasks: ListrTask[] = [];

		returnTasks.push({
			title: 'Reversing model files',
			task: (ctx) => {
				const reverseLocales: ListrTask[] = [];
				const locales = this.getLocales(ctx.locales);
				for (const locale of locales) {
					reverseLocales.push({
						title: locale.toString(),
						task: () => {
							const alexaModel = this.getModel(locale);
							const alexaInteractionModel = new AlexaInteractionModel(alexaModel);
							const jovoModel = alexaInteractionModel.reverse(alexaModel);
							return project.saveModel(
								jovoModel,
								locale);
						},
					});
				}
				return new listr(reverseLocales);
			},
		});

		try {
			project.getConfigParameter(JovoCliPlatformAlexa.PLATFORM_KEY, ctx.stage);
		} catch (err) {
			returnTasks.push({
				title: 'Initializing Alexa Skill into app.json',
				task: (ctx) => {
					return project.updatePlatformConfig(JovoCliPlatformAlexa.PLATFORM_KEY);
				},
			});
		}


		return returnTasks;
	}



	/**
	 * Get tasks to deploy project
	 *
	 * @param {JovoTaskContextAlexa} ctx The Context
	 * @param {JovoCliDeploy[]} targets The additional deploy targets
	 * @returns {ListrTask[]}
	 * @memberof JovoCliPlatform
	 */
	getDeployTasks(ctx: JovoTaskContextAlexa, targets: JovoCliDeploy[]): ListrTask[] {
		const returnTasks: ListrTask[] = [];

		// @ts-ignore
		const additionalTargetKeys: string[] = targets.map((target) => target.constructor.TARGET_KEY);

		try {
			ctx.skillId = this.getSkillId();
		} catch (error) {
			if (!ctx.target || ctx.target && !additionalTargetKeys.includes(ctx.target)) {
				console.log(`Couldn't find a platform. Please use init <platform> or get to retrieve platform files.`); // eslint-disable-line
				return [];
			}
		}

		returnTasks.push({
			title: 'Deploying Alexa Skill ' + Utils.printStage(ctx.stage),
			task: (ctx: JovoTaskContextAlexa, task: ListrTaskWrapper) => {

				const deployTasks: ListrTask[] = [
					{
						title:
							`Creating Alexa Skill project for ASK profile ${highlight(ctx.askProfile)}`, // eslint-disable-line
						enabled: (ctx: JovoTaskContextAlexa) => _.isUndefined(ctx.skillId) &&
							(!ctx.target || !!ctx.target && !additionalTargetKeys.includes(ctx.target)),
						task: (ctx: JovoTaskContextAlexa) => {
							ctx.target = TARGET_ALL;
							return ask.checkAsk().then(() => {
								return ask.askApiCreateSkill(
									ctx,
									this.getSkillJsonPath()
								).then((skillId) => {
									ctx.skillId = skillId;
									ctx.newSkill = true;
									return this.setAlexaSkillId(skillId);
								}).then(() => ask.getSkillStatus(ctx)).then(() => {
									let info = 'Info: ';
									const skillInfo = this.getSkillInformation();
									info += `Skill Name: ${skillInfo.name}
Skill ID: ${skillInfo.skillId}
Invocation Name: ${skillInfo.invocationName}
Endpoint: ${skillInfo.endpoint}`;
									task.skip(info);
								});
							});
						},
					}, {
						title: 'Updating Alexa Skill project for ASK profile ' + ctx.askProfile,
						enabled: (ctx: JovoTaskContextAlexa) => !_.isUndefined(ctx.skillId) &&
							_.isUndefined(ctx.newSkill) &&
							(ctx.target === TARGET_ALL || ctx.target === TARGET_INFO),
						task: (ctx: JovoTaskContextAlexa, task: ListrTaskWrapper) => {
							return ask.askApiUpdateSkill(
								ctx,
								this.getSkillJsonPath()
							).then(() => ask.getSkillStatus(ctx)).then(() => {
								let info = 'Info: ';
								const skillInfo = this.getSkillInformation();
								info += `Skill Name: ${skillInfo.name}
Skill ID: ${skillInfo.skillId}
Invocation Name: ${skillInfo.invocationName}
Endpoint: ${skillInfo.endpoint}`;
								task.skip(info);
								return Promise.resolve();
							});
						},
					}, {
						title: 'Deploying Interaction Model, waiting for build',
						enabled: (ctx: JovoTaskContextAlexa) => ctx.target === TARGET_ALL ||
							ctx.target === TARGET_MODEL,
						task: (ctx: JovoTaskContextAlexa) => {
							const deployLocaleTasks: ListrTask[] = [];

							for (const locale of this.getLocales(ctx.locales)) {
								deployLocaleTasks.push({
									title: locale,
									task: (ctx: JovoTaskContextAlexa) => {
										const config = _.cloneDeep(ctx);
										config.locales = [locale];
										return ask.askApiUpdateModel(
											config,
											this.getModelPath(locale),
											locale).then(() => ask.getModelStatus(config));
									},
								});
							}
							return new listr(deployLocaleTasks);
						},
					}
				];

				// Add the deploy target tasks
				if (!ctx.newSkill) {
					targets.forEach((target) => {
						deployTasks.push.apply(deployTasks, target.execute(ctx, project));
					});
				}

				deployTasks.push(
					{
						title: 'Enabling skill for testing',
						enabled: (ctx: JovoTaskContextAlexa) => !_.isUndefined(ctx.newSkill),
						task: (ctx: JovoTaskContextAlexa) => {
							return ask.askApiEnableSkill(ctx);
						},
					}
				);

				return new listr(deployTasks);
			},
		});

		return returnTasks;
	}


    /**
     * Returns path to Alexa model files
     * @return {string}
     */
	getModelsPath(): string {
		return path.join(this.getPath(), 'models');
	}

    /**
     * Returns path to Alexa Model file
     * @param {string} locale
     * @return {string}
     */
	getModelPath(locale: string): string {
		return path.join(this.getModelsPath(), locale + '.json');
	}


    /**
     * Returns project locales
     *
     * @param {(string | string[])} [locale]
     * @returns {string[]}
     * @memberof JovoCliPlatformAlexa
     */
	getLocales(locale?: string | string[]): string[] {
		try {
			if (locale) {
				if (Array.isArray(locale)) {
					return locale;
				} else {
					return [locale];
				}
			}
			const files = fs.readdirSync(this.getModelsPath());

			if (files.length === 0) {
				return [project.DEFAULT_LOCALE];
			}
			const locales: string[] = [];
			for (const file of files) {
				if (file.length === 10) {
					locales.push(file.substr(0, 5));
				}
			}
			return locales;
		} catch (err) {
			throw err;
		}
	}


    /**
     * Returns path to AlexaSkill account linking json
     * @return {string}
     */
	getAccountLinkingPath(): string {
		return path.join(this.getPath(), 'accountLinking.json');
	}

    /**
     * Returns project skill id extracted from
     * Alexa Skill config
     * @return {string}
     */
	getSkillId() {
		try {
			const skillId = _.get(this.getAskConfig(), 'deploy_settings.default.skill_id');
			if (skillId && skillId.length > 0) {
				return skillId;
			}
		} catch (err) {
			throw err;
		}
	}

    /**
     * Returns path to skill.json
     * @return {string}
     */
	getSkillJsonPath(): string {
		return path.join(this.getPath(), 'skill.json');
	}

    /**
     * Returns path to .ask/
     * @return {string}
     */
	getAskConfigFolderPath(): string {
		return path.join(this.getPath(), '.ask');
	}

    /**
     * Returns path to .ask/config file
     * @return {string}
     */
	getAskConfigPath(): string {
		return path.join(this.getAskConfigFolderPath(), 'config');
	}

    /**
     * Returns skill.json object
     * @return {*}
     */
	getSkillJson() {
		try {
			return require(this.getSkillJsonPath());
		} catch (error) {
			throw error;
		}
	}

    /**
     * Returns .ask/config object
     * @return {any}
     */
	getAskConfig() {
		try {
			return JSON.parse(fs.readFileSync(this.getAskConfigPath(), 'utf8'));
		} catch (error) {
			throw error;
		}
	}


	/**
	 * Returns Alexa model object
	 *
	 * @param {string} locale The locale to load
	 * @param {boolean} [refresh] If the file cache should be refreshed
	 * @returns
	 * @memberof JovoCliPlatformAlexa
	 */
	getModel(locale: string, refresh?: boolean) {
		try {
			const path = this.getModelPath(locale);
			if (refresh === true) {
				// Delete the cache so that it gets read new from disk
				delete require.cache[path];
			}
			return require(path);
		} catch (error) {
			throw error;
		}
	}


    /**
     * Creates empty skill.json
     * @param {string} skillName
     * @param {Array<string>} locales
     * @return {*}
     */
	createEmptySkillJson(skillName: string, locales: string[] | undefined) {
		const skillJson = {
			'manifest': {
				'publishingInformation': {
					'locales': {
					},
					'isAvailableWorldwide': true,
					'testingInstructions': 'Sample Testing Instructions.',
					'category': 'EDUCATION_AND_REFERENCE',
					'distributionCountries': [],
				},
				'apis': {

				},
				'manifestVersion': '1.0',
			},
		};

		if (locales) {
			for (const locale of locales) {
				if (locale.length === 2) {
					try {
						const appJson = project.getConfig();

						if (!_.get(appJson, `alexaSkill.nlu.lang.${locale}`)) {
							throw new Error();
						}
						const sublocales = _.get(appJson, `alexaSkill.nlu.lang.${locale}`);

						for (const sublocale of sublocales) {
							_.set(skillJson, `manifest.publishingInformation.locales.${sublocale}`, {
								'summary': 'Sample Short Description',
								'examplePhrases': [
									'Alexa open hello world',
								],
								'name': skillName,
								'description': 'Sample Full Description',
							});
						}
					} catch (error) {
						throw new Error('Could not retrieve locales mapping for language ' + locale);
					}
				} else {
					_.set(skillJson, `manifest.publishingInformation.locales.${locale}`, {
						'summary': 'Sample Short Description',
						'examplePhrases': [
							'Alexa open hello world',
						],
						'name': skillName,
						'description': 'Sample Full Description',
					});
				}
			}
		}

		return skillJson;
	}

    /**
     * Creates empty model object
     * @return {*}
     */
	createEmptyModelJson() {
		return {
			'interactionModel': {
				'languageModel': {},
			},
		};
	}


    /**
     * Creates empty skill project files
     * @param {*} config
     * @return {Promise<any>}
     */
	createAlexaSkill(ctx: JovoTaskContextAlexa) {
		return new Promise((resolve, reject) => {
			const alexaSkillPath = this.getPath();

			if (!fs.existsSync(alexaSkillPath)) {
				fs.mkdirSync(alexaSkillPath);
			}

			const alexaModelPath = this.getModelsPath();
			if (!fs.existsSync(alexaModelPath)) {
				fs.mkdirSync(alexaModelPath);
			}

			const askConfigPath = this.getAskConfigFolderPath();
			if (!fs.existsSync(askConfigPath)) {
				fs.mkdirSync(askConfigPath);
			}

			const skillJson = this.createEmptySkillJson(
				project.getProjectName(),
				ctx.locales
			);


			_.set(skillJson, 'manifest.apis.custom', {});


			fs.writeFile(this.getSkillJsonPath(), JSON.stringify(skillJson, null, '\t'), (err) => {
				if (err) {
					reject(err);
					return;
				}
				const askConfig = {
					deploy_settings: {
						default: {
							skill_id: '',
							was_cloned: false,
						},
					},
				};
				fs.writeFile(this.getAskConfigPath(), JSON.stringify(askConfig, null, '\t'), (err) => {
					if (err) {
						reject(err);
						return;
					}
					resolve();
				});
			});
		});
	}

    /**
     * Builds and saves Alexa Skill model from jovo model
     * @param {string} locale
     * @param {string} stage
     * @return {Promise<any>}
     */
	buildLanguageModelAlexa(locale: string, stage: string) {
		return new Promise((resolve, reject) => {
			try {
				let alexaModel;
				try {
					alexaModel = this.getModel(locale);
				} catch (err) {
					alexaModel = this.createEmptyModelJson();
				}
				const aim = new AlexaInteractionModel(alexaModel);
				aim.transform(locale, stage, this.getModelPath.bind(this));
				resolve();
			} catch (error) {
				reject(error);
			}
		});
	}

    /**
     * Builds and saves Alexa Skill model from jovo model
     * @param {string} stage
     * @return {Promise<any>}
     */
	buildSkillAlexa(stage: string) {

		return new Promise((resolve, reject) => {
			try {

				const config = project.getConfig(stage);
				const skillJson = this.getSkillJson();
				// endpoint
				if (_.get(config, 'endpoint')) {
					// create basic https endpoint from wildcard ssl
					if (_.isString(_.get(config, 'endpoint'))) {
						_.set(skillJson, 'manifest.apis.custom.endpoint', {
							sslCertificateType: 'Wildcard',
							uri: project.getEndpointFromConfig(_.get(config, 'endpoint')),
						});
					} else if (_.isObject(_.get(config, 'endpoint')) && _.get(config, 'endpoint.alexaSkill')) {
						// get full object
						_.set(skillJson, 'manifest.apis.custom.endpoint',
							project.getEndpointFromConfig(_.get(config, 'endpoint.alexaSkill'))
						);
					}
				} else {
					let arn = _.get(config, 'alexaSkill.endpoint');

					if (!arn) {
						arn = _.get(config, 'alexaSkill.host.lambda.arn') ||
							_.get(config, 'host.lambda.arn');
					}

					if (arn) {
						if (_.startsWith(arn, 'arn')) {
							_.set(skillJson, 'manifest.apis.custom.endpoint', {
								uri: arn,
							});
						} else {
							_.set(skillJson, 'manifest.apis.custom.endpoint', {
								sslCertificateType: 'Wildcard',
								uri: arn,
							});
						}
					}
				}
				if (_.get(config, 'alexaSkill.manifest')) {
					_.merge(skillJson.manifest, config.alexaSkill.manifest);
				}

				fs.writeFile(this.getSkillJsonPath(), JSON.stringify(skillJson, null, '\t'), (err) => {
					if (err) {
						reject(err);
						return;
					}
					if (typeof project.getConfigParameter('alexaSkill.skillId', stage) !== 'undefined') {
						this.setAlexaSkillId(project.getConfigParameter('alexaSkill.skillId', stage))
							.then(() => resolve());
					} else {
						resolve();
					}
				});
			} catch (err) {
				return reject(err);
			}
		});
	}

    /**
     * Returns skill id promise
     * @return {Promise<any>}
     */
	getSkillIdPromise() {
		return new Promise((resolve) => {
			fs.readFile(this.getAskConfigPath(), 'utf-8', (err, data) => {
				if (err) {
					resolve();
					return;
				}
				resolve(_.get(JSON.parse(data), 'deploy_settings.default.skill_id'));
			});
		});
	}

    /**
     * Returns skill information
     * @return {*}
     */
	getSkillInformation() {
		const skillJson = this.getSkillJson();
		const info = {
			name: '',
			invocationName: '',
			skillId: this.getSkillId(),
			endpoint: skillJson.manifest.apis.custom.endpoint.uri
		};

		const locales = skillJson.manifest.publishingInformation.locales;
		for (const locale of Object.keys(locales)) {
			info.name += locales[locale].name + ' (' + locale + ') ';
			info.invocationName += this.getInvocationName(locale) + ' (' + locale + ') ';
		}
		return info;
	}

    /**
     * Returns simple skill information
     * @return {*}
     */
	getSkillSimpleInformation() {
		const skillJson = this.getSkillJson();

		const info = {
			name: '',
			skillId: this.getSkillId(),
			endpoint: _.get(skillJson, 'manifest.apis.custom.endpoint.uri', ''),
		};

		const locales = skillJson.manifest.publishingInformation.locales;
		for (const locale of Object.keys(locales)) {
			info.name += locales[locale].name + ' (' + locale + ') ';
		}

		return info;
	}

    /**
     * Returns true if endpoint is a lambda function arn
     * @return {boolean}
     */
	isLambdaEndpoint() {
		const skillJson = this.getSkillJson();
		return _.startsWith(skillJson.manifest.apis.custom.endpoint.uri, 'arn');
	}

    /**
     * Returns invocationName for given locale
     * @param {string} locale
     * @return {{}|interactionModel.languageModel}
     */
	getInvocationName(locale: string) {
		return this.getModel(locale).interactionModel.languageModel.invocationName;
	}


    /**
     * Saves Skill ID to .ask/config
     * @param {string} skillId
     * @return {Promise<any>}
     */
	setAlexaSkillId(skillId: string) {
		return new Promise((resolve, reject) => {
			if (!fs.existsSync(this.getAskConfigFolderPath())) {
				fs.mkdirSync(this.getAskConfigFolderPath());
			}

			fs.readFile(this.getAskConfigPath(), 'utf-8', (err, data) => {
				let askConfig;
				if (err) {
					if (err.code === 'ENOENT') {
						askConfig = {
							deploy_settings: {
								default: {
									skill_id: skillId,
									was_cloned: false,
								},
							},
						};
					}
				} else {
					askConfig = JSON.parse(data);
				}
				_.set(askConfig, 'deploy_settings.default.skill_id', skillId);
				fs.writeFile(this.getAskConfigPath(), JSON.stringify(askConfig, null, '\t'), (err) => {
					if (err) {
						reject(err);
						return;
					}
					resolve(skillId);
				});
			});
		});
	}

}
