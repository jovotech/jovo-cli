'use strict';

import * as DialogFlowUtil from './DialogflowUtil';
import * as GoogleActionUtil from './GoogleActionUtil';
const BUILTIN_PREFIX = '@sys.';

import { join as pathJoin, sep as pathSep } from 'path';
const _ = require('lodash');
// import * as _ from 'lodash';
import Vorpal = require('vorpal');
import * as fs from 'fs';
import * as inquirer from 'inquirer';
import * as listr from 'listr';
import { ListrTask, ListrTaskWrapper } from 'listr';
const highlight = require('chalk').white.bold;
const subHeadline = require('chalk').white.dim;
import { AppFileDialogFlow } from './';

import { AppFile, ArgOptions, InputType, IntentInput, JovoCliDeploy, JovoCliPlatform, JovoModel, Project, Utils } from 'jovo-cli-core';
import { DialogFlowLMInputParameterObject, DialogFlowLMInputObject, DialogFlowLMIntent, DialogFlowLMIntentData, DialogFlowLMEntity, IntentDialogFlow, JovoTaskContextGoogle } from './';

import * as JovoModelDialogFlowValidator from '../validators/JovoModelDialogFlow.json';


const project = require('jovo-cli-core').getProject();


const DEFAULT_INTENT = {
	'auto': true,
	'contexts': [],
	'responses': [
		{
			'resetContexts': false,
			'affectedContexts': [],
			'parameters': [],
			'defaultResponsePlatforms': {},
			'speech': [],
		},
	],
	'priority': 500000,
	'webhookUsed': false,
	'webhookForSlotFilling': false,
	'fallbackIntent': false,
	'events': [],
};

const DEFAULT_ENTITY = {
	'isOverridable': true,
	'isEnum': false,
	'automatedExpansion': false,
};




export class JovoCliPlatformGoogle extends JovoCliPlatform {

	static PLATFORM_KEY = 'googleAction';
	static ID_KEY = 'projectId';

    /**
     * Constructor
     * Config with locale information
     * @param {*} config
     */
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
			let projectId;
			if (argOptions && argOptions.hasOwnProperty('project-id') && argOptions['project-id']) {
				projectId = argOptions['skill-id'];
			} else {
				projectId = project.getConfigParameter('googleAction.dialogflow.projectId', argOptions && argOptions.stage);
			}

			const returnValue = {};
			if (projectId) {
				// @ts-ignore
				returnValue.projectId = projectId;
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
		return {};
	}


	/**
	 * Returns the validator to check if the platform specific properties are valid
	 *
	 * @returns {tv4.JsonSchema}
	 * @memberof JovoCliPlatformGoogle
	 */
	getModelValidator(): tv4.JsonSchema {
		return JovoModelDialogFlowValidator;
	}


	/**
	 * Returns existing projects of user
	 *
	 * @param {AppFile} config Configuration file
	 * @returns {Promise<object>}
	 * @memberof JovoCliPlatform
	 */
	async getExistingProjects(config: AppFile): Promise<inquirer.ChoiceType[]> {
		return DialogFlowUtil.v2.getProjects();
	}


	getAdditionalCliOptions(command: string, vorpalCommand: Vorpal.Command): void {
		if (['get', 'deploy'].includes(command)) {
			vorpalCommand
				.option('--project-id <projectId>',
					'Google Cloud Project ID');
		}
	}

	validateAdditionalCliOptions(command: string, args: Vorpal.Args): boolean {
		return true;
	}


	/**
	 * Returns if project already contains Google
	 *
	 * @returns {boolean}
	 * @memberof JovoCliPlatform
	 */
	hasPlatform(): boolean {
		try {
			require(DialogFlowUtil.getAgentJsonPath());
			return true;
		} catch (err) {
			return false;
		}
	}


    /**
     * Returns project locales
     *
     * @param {(string | string[])} [locale]
     * @returns {string[]}
     * @memberof JovoCliPlatformAlexa
     */
	getLocales(locale?: string | string[]): string[] {
		const agentJson = DialogFlowUtil.getAgentJson();
		let supportedLanguages = [agentJson.language];

		if (agentJson.supportedLanguages) {
			supportedLanguages = supportedLanguages.concat(agentJson.supportedLanguages);
		}

		return supportedLanguages;
	}


	/**
	 * Set platform defaults on model
	 *
	 * @param {JovoModel} model The model to set the data on
	 * @returns {JovoModel}
	 * @memberof JovoCliPlatform
	 */
	setPlatformDefaults(model: JovoModel): JovoModel {
		_.set(model, 'dialogflow.intents', DialogFlowUtil.getDefaultIntents());
		return model;
	}


	/**
	 * Add Google to configuration file
	 *
	 * @param {AppFile} config
	 * @returns {AppFile}
	 * @memberof JovoCliPlatform
	 */
	addPlatfromToConfig(config: AppFileDialogFlow): AppFileDialogFlow {
		if (!config.googleAction) {
			_.extend(config, {
				googleAction: {
					nlu: {
						name: 'dialogflow',
					},
				},
			});
		}

		return config;
	}


	/**
	 * Gets tasks to build platform specific language model
	 *
	 * @param {JovoTaskContextGoogle} ctx The Context
	 * @returns {ListrTask[]}
	 * @memberof JovoCliPlatform
	 */
	getBuildTasks(ctx: JovoTaskContextGoogle): ListrTask[] {
		// const returnTasks: listr[] = [];
		const returnTasks: ListrTask[] = [];

		const googleActionPath = GoogleActionUtil.getPath();
		if (!fs.existsSync(googleActionPath)) {
			fs.mkdirSync(googleActionPath);
		}
		const dialogFlowPath = DialogFlowUtil.getPath();
		if (!fs.existsSync(dialogFlowPath)) {
			fs.mkdirSync(dialogFlowPath);
		}
		const hasGoogleActionDialogflow = this.hasPlatform();
		let title = 'Creating Google Action project files ' + Utils.printStage(ctx.stage);
		let titleAgentJson = 'Creating Dialogflow Agent';
		let titleInteractionModel = 'Creating Language Model';

		if (hasGoogleActionDialogflow) {
			title = 'Updating Google Action project files ' + Utils.printStage(ctx.stage);
			titleAgentJson = 'Updating Dialogflow Agent';
			titleInteractionModel = 'Updating Language Model';
		}
		title += '\n' + subHeadline('   Path: ./platforms/googleAction');
		titleAgentJson += '\n' + subHeadline('   Path: ./platforms/googleAction/dialogflow');
		titleInteractionModel += '\n' + subHeadline('   Path: ./platforms/googleAction/dialogflow/intents, ./platforms/googleAction/dialogflow/entities');

		returnTasks.push({
			title,
			task: () => {
				const buildSubTasks = [{
					title: titleAgentJson,
					task: (ctx: JovoTaskContextGoogle) => {
						return new listr([
							{
								title: 'agent.json',
								task: () => {
									return Promise.resolve();
								},
							},
							{
								title: 'package.json',
								task: (ctx, task) => {
									return DialogFlowUtil.buildDialogFlowAgent(ctx)
										.then(() => Utils.wait(500));
								},
							},
						]);
					},
				}, {
					title: titleInteractionModel,
					task: (ctx: JovoTaskContextGoogle) => {
						const buildLocalesTasks: ListrTask[] = [];
						// delete old folder
						if (fs.existsSync(DialogFlowUtil.getIntentsFolderPath())) {
							fs.readdirSync(DialogFlowUtil.getIntentsFolderPath()).forEach((file, index) => { //eslint-disable-line
								const curPath = pathJoin(DialogFlowUtil.getIntentsFolderPath(), file); //eslint-disable-line
								fs.unlinkSync(curPath);
							});
						}

						if (fs.existsSync(DialogFlowUtil.getEntitiesFolderPath())) {
							fs.readdirSync(DialogFlowUtil.getEntitiesFolderPath()).forEach((file, index) => { //eslint-disable-line
								const curPath = pathJoin(DialogFlowUtil.getEntitiesFolderPath(), file); //eslint-disable-line
								fs.unlinkSync(curPath);
							});
						}
						if (ctx.locales) {
							for (const locale of ctx.locales) {
								buildLocalesTasks.push({
									title: locale,
									task: () => {
										this.transform(locale, ctx.stage);
										return Promise.resolve()
											.then(() => Utils.wait(500));
									},
								});
							}
						}
						return new listr(buildLocalesTasks);
					},
				}];
				// return Promise.resolve();
				return new listr(buildSubTasks);
			},
		});

		return returnTasks;
	}




	/**
	 * Get tasks to get existing platform project
	 *
	 * @param {JovoTaskContextGoogle} ctx The Context
	 * @returns {ListrTask[]}
	 * @memberof JovoCliPlatform
	 */
	getGetTasks(ctx: JovoTaskContextGoogle): ListrTask[] {

		const googleActionPath = GoogleActionUtil.getPath();
		if (!fs.existsSync(googleActionPath)) {
			fs.mkdirSync(googleActionPath);
		}


		const dialogflowPath = DialogFlowUtil.getPath();
		if (!fs.existsSync(dialogflowPath)) {
			fs.mkdirSync(dialogflowPath);
		}

		return [
			{
				title: 'Getting Dialogflow Agent files and saving to /platforms/googleAction/dialogflow',
				task: (ctx, task) => {
					const keyFile = project.getConfigParameter('googleAction.dialogflow.keyFile', ctx.stage);
					let p = Promise.resolve();
					if (keyFile) {
						if (!fs.existsSync(process.cwd() + pathSep + keyFile)) {
							throw new Error(
								`Keyfile ${process.cwd() + pathSep + keyFile} does not exist.`);
						}
						ctx.keyFile = process.cwd() + pathSep + keyFile;
						p = p.then(() => DialogFlowUtil.v2.activateServiceAccount(ctx));
					}


					p = p.then(() => DialogFlowUtil.getAgentFiles(ctx));
					return p;
				},
			},
		];
	}


	/**
	 * Get tasks to build Jovo language model from platform
	 * specific language model
	 *
	 * @param {JovoTaskContextGoogle} ctx The Context
	 * @returns {ListrTask[]}
	 * @memberof JovoCliPlatform
	 */
	getBuildReverseTasks(ctx: JovoTaskContextGoogle): ListrTask[] {

		const returnTasks: ListrTask[] = [];

		returnTasks.push({
			title: 'Reversing model files',
			task: (ctx) => {
				const reverseLocales: ListrTask[] = [];

				const supportedLanguages = this.getLocales();

				for (let locale of supportedLanguages) {

					// transform en-us to en-US
					if (locale.length === 5) {
						locale = locale.substr(0, 2) + '-' + locale.substr(3).toUpperCase();
					}

					reverseLocales.push({
						title: locale,
						task: () => {
							const jovoModel = this.reverse(locale);
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
			project.getConfigParameter('googleAction', ctx.stage);
		} catch (err) {
			returnTasks.push({
				title: 'Initializing GoogleAction into app.json',
				task: (ctx) => {
					return project.updatePlatformConfig(JovoCliPlatformGoogle.PLATFORM_KEY);
				},
			});
		}

		return returnTasks;
	}



	/**
	 * Get tasks to deploy project
	 *
	 * @param {JovoTaskContextGoogle} ctx The Context
	 * @param {JovoCliDeploy[]} targets The additional deploy targets
	 * @returns {ListrTask[]}
	 * @memberof JovoCliPlatform
	 */
	getDeployTasks(ctx: JovoTaskContextGoogle, targets: JovoCliDeploy[]): ListrTask[] {

		const config = project.getConfig(ctx.stage);

		const returnTasks: ListrTask[] = [];

		let arn = _.get(config, 'googleAction.host.lambda.arn') ||
			_.get(config, 'host.lambda.arn');

		if (!arn) {
			arn = _.get(config, 'googleAction.endpoint') ||
				_.get(config, 'endpoint');
			arn = _.startsWith(arn, 'arn') ? arn : undefined;
		}

		returnTasks.push({
			title: 'Deploying Google Action ' + Utils.printStage(ctx.stage) + ctx.projectId,
			task: (ctx, task) => {

				const deployTasks: ListrTask[] = [
{
						title: 'Creating file /googleAction/dialogflow_agent.zip',
						task: (ctx: JovoTaskContextGoogle, task: ListrTaskWrapper) => {
							return DialogFlowUtil.zip().then(() => {
								let info = 'Info: ';

								info += `Language model: `;
								for (const locale of project.getLocales()) {
									info += `${locale} `;
								}
								info += '\n';
								info += `Fulfillment Endpoint: ${DialogFlowUtil.getAgentJson().webhook.url}`; // eslint-disable-line
								task.skip(info);
							});
						},
					},
					{
						title: `Uploading and restoring agent for project ${highlight(ctx.projectId)}`, // eslint-disable-line
						enabled: (ctx: JovoTaskContextGoogle) => !!ctx.projectId,
						task: (ctx: JovoTaskContextGoogle, task: ListrTaskWrapper) => {
							ctx.pathToZip = GoogleActionUtil.getPath() + '/dialogflow_agent.zip';

							const keyFile = project.getConfigParameter('googleAction.dialogflow.keyFile', ctx.stage);
							let p = Promise.resolve();
							if (keyFile) {
								if (!fs.existsSync(process.cwd() + pathSep + keyFile)) {
									throw new Error(
										`Keyfile ${process.cwd() + pathSep + keyFile} does not exist.`);
								}
								ctx.keyFile = process.cwd() + pathSep + keyFile;
								p = p.then(() => DialogFlowUtil.v2.activateServiceAccount(ctx));
							}

							p = p.then(() => DialogFlowUtil.v2.checkGcloud())
								.then(() => DialogFlowUtil.v2.restoreAgent(ctx));
							return p;
						},
					},
					{
						title: 'Training started',
						enabled: (ctx: JovoTaskContextGoogle) => !!ctx.projectId,
						task: (ctx: JovoTaskContextGoogle, task: ListrTaskWrapper) => {
							return DialogFlowUtil.v2.trainAgent(ctx);
						},
					}
				];

				// Add the deploy target tasks
				targets.forEach((target) => {
					deployTasks.push.apply(deployTasks, target.execute(ctx, project));
				});

				return new listr(deployTasks);
			},
		});

		return returnTasks;
	}




    /**
     * Skips default intent properties
     * @param {*} jovoIntent
     * @param {*} dialogFlowIntent
     * @param {string} locale
     * @return {*}
     */
	static skipDefaultIntentProps(jovoIntent: IntentDialogFlow, dialogFlowIntent: DialogFlowLMInputObject, locale: string) {
		if (_.get(dialogFlowIntent, 'auto') !== _.get(DEFAULT_INTENT, 'auto')) {
			_.set(jovoIntent, 'dialogflow.auto', _.get(dialogFlowIntent, 'auto'));
		}

		if (_.difference(_.get(dialogFlowIntent, 'contexts'), _.get(DEFAULT_INTENT, 'contexts')).length > 0) {
			_.set(jovoIntent, 'dialogflow.contexts', _.get(dialogFlowIntent, 'contexts'));
		}
		if (_.get(dialogFlowIntent, 'priority') !== _.get(DEFAULT_INTENT, 'priority')) {
			_.set(jovoIntent, 'dialogflow.priority', _.get(dialogFlowIntent, 'priority'));
		}
		if (_.get(dialogFlowIntent, 'webhookUsed') !== _.get(DEFAULT_INTENT, 'webhookUsed')) {
			_.set(jovoIntent, 'dialogflow.webhookUsed', _.get(dialogFlowIntent, 'webhookUsed'));
		}
		if (_.get(dialogFlowIntent, 'webhookForSlotFilling') !== _.get(DEFAULT_INTENT, 'webhookForSlotFilling')) {
			_.set(jovoIntent, 'dialogflow.webhookForSlotFilling', _.get(dialogFlowIntent, 'webhookForSlotFilling'));
		}
		if (_.get(dialogFlowIntent, 'fallbackIntent') !== _.get(DEFAULT_INTENT, 'fallbackIntent')) {
			_.set(jovoIntent, 'dialogflow.fallbackIntent', _.get(dialogFlowIntent, 'fallbackIntent'));
		}
		if (_.difference(_.get(dialogFlowIntent, 'events'), _.get(DEFAULT_INTENT, 'events')).length > 0) {
			_.set(jovoIntent, 'dialogflow.events', _.get(dialogFlowIntent, 'events'));
		}

		// skip parameters object in responses. it's handled somewhere else
		if (!_.isEqual(_.get(dialogFlowIntent, 'responses'), _.get(DEFAULT_INTENT, 'responses'))) {
			if (!_.isEqual(_.get(dialogFlowIntent, 'responses[0].resetContexts'), _.get(DEFAULT_INTENT, 'responses[0].resetContexts'))) {
				_.set(jovoIntent, 'dialogflow.responses[0].resetContexts', _.get(dialogFlowIntent, 'responses[0].resetContexts'));
			}

			if (!_.isEqual(_.get(dialogFlowIntent, 'responses[0].affectedContexts'), _.get(DEFAULT_INTENT, 'responses[0].affectedContexts'))) {
				_.set(jovoIntent, 'dialogflow.responses[0].affectedContexts', _.get(dialogFlowIntent, 'responses[0].affectedContexts'));
			}

			if (!_.isEqual(_.get(dialogFlowIntent, 'responses[0].defaultResponsePlatforms'), _.get(DEFAULT_INTENT, 'responses[0].defaultResponsePlatforms'))) {
				_.set(jovoIntent, 'dialogflow.responses[0].defaultResponsePlatforms', _.get(dialogFlowIntent, 'responses[0].defaultResponsePlatforms'));
			}

			if (!_.isEqual(_.get(dialogFlowIntent, 'responses[0].messages'), _.get(DEFAULT_INTENT, 'responses[0].messages'))) {

				for (const message of _.get(dialogFlowIntent, 'responses[0].messages')) {
					Utils.log(dialogFlowIntent.name + '--- ' + _.get(message, 'lang') + '=== ' + locale);
					if (_.get(message, 'lang') === locale) {
						const jovoIntentDialogFlowMessages = _.get(jovoIntent, 'dialogflow.responses[0].messages', []);

						if (message.speech.length > 0) {
							jovoIntentDialogFlowMessages.push(message);
							Utils.log(jovoIntentDialogFlowMessages);
							_.set(jovoIntent, 'dialogflow.responses[0].messages', jovoIntentDialogFlowMessages);
						}

					}
				}
			}
			if (!_.isEqual(_.get(dialogFlowIntent, 'responses[0].speech'), _.get(DEFAULT_INTENT, 'responses[0].speech'))) {
				_.set(jovoIntent, 'dialogflow.responses[0].speech', _.get(dialogFlowIntent, 'responses[0].speech'));
			}
		}
		return jovoIntent;
	}

    /**
     * Skips default entity properties
     * @param {*} jovoInput
     * @param {*} dialogflowEntity
     * @return {*}
     */
	static skipDefaultEntityProps(jovoInput: InputType, dialogflowEntity: DialogFlowLMEntity) {
		if (_.get(dialogflowEntity, 'isOverridable') !== _.get(DEFAULT_ENTITY, 'isOverridable')) {
			_.set(jovoInput, 'dialogflow.isOverridable', _.get(dialogflowEntity, 'isOverridable'));
		}
		if (_.get(dialogflowEntity, 'isEnum') !== _.get(DEFAULT_ENTITY, 'isEnum')) {
			_.set(jovoInput, 'dialogflow.isEnum', _.get(dialogflowEntity, 'isEnum'));
		}
		if (_.get(dialogflowEntity, 'automatedExpansion') !== _.get(DEFAULT_ENTITY, 'automatedExpansion')) {
			_.set(jovoInput, 'dialogflow.automatedExpansion', _.get(dialogflowEntity, 'automatedExpansion'));
		}
		return jovoInput;
	}

    /**
     * Transforms Dialogflow data into a Jovo model
     * @param {string} locale
     * @return {{}}
     */
	// static reverse(locale) {
	reverse(locale: string) {
		const jovoModel: JovoModel = {
			invocation: '',
			intents: [],
			inputTypes: [],
		};

		const intentFiles = fs.readdirSync(DialogFlowUtil.getIntentsFolderPath());


		// iterate through intent files
		for (const file of intentFiles) {
			// skip usersays files
			if (file.indexOf('usersays') > -1) {
				continue;
			}
			const dialogFlowIntent = require(DialogFlowUtil.getIntentsFolderPath() + pathSep + file);


			const jovoIntent: IntentDialogFlow = {
				name: dialogFlowIntent.name,
				phrases: [],
			};
			// skip default intent properties
			JovoCliPlatformGoogle.skipDefaultIntentProps(jovoIntent, dialogFlowIntent, locale);

			// is fallback intent?
			if (dialogFlowIntent.fallbackIntent === true) {
				// @ts-ignore
				const fallbackIntent: IntentDialogFlow = jovoIntent.dialogflow;
				fallbackIntent.name = dialogFlowIntent.name;
				_.set(jovoModel, 'dialogflow.intents', [fallbackIntent]);
				continue;
			}

			// is welcome intent?
			if (_.get(dialogFlowIntent, 'events[0].name') === 'WELCOME') {
				const welcomeIntent = jovoIntent.dialogflow;
				// @ts-ignore
				welcomeIntent.name = dialogFlowIntent.name;

				if (!_.get(jovoModel, 'dialogflow.intents')) {
					_.set(jovoModel, 'dialogflow.intents', [welcomeIntent]);
				} else {
					// @ts-ignore
					jovoModel.dialogflow.intents.push(welcomeIntent);
				}
				continue;
			}

			const inputs: IntentInput[] = [];
			if (dialogFlowIntent.responses) {
				for (const response of dialogFlowIntent.responses) {
					for (const parameter of _.get(response, 'parameters', [])) {
						const input: IntentInput = {
							name: parameter.name,
						};
						if (parameter.dataType) {
							if (_.startsWith(parameter.dataType, '@sys.')) {
								input.type = {
									dialogflow: parameter.dataType,
								};
							} else {
								input.type = parameter.dataType.substr(1);
							}
							inputs.push(input);
						}
					}
				}
			}


			if (inputs.length > 0) {
				jovoIntent.inputs = inputs;
			}

			// iterate through usersays intent files and generate sample phrases
			const userSaysFilePath = DialogFlowUtil.getIntentsFolderPath() + pathSep + dialogFlowIntent.name + '_usersays_' + locale + '.json';
			if (fs.existsSync(userSaysFilePath)) {
				const userSays = require(userSaysFilePath);
				for (const us of userSays) {
					let phrase = '';
					for (const data of us.data) {
						phrase += data.alias ? '{' + data.alias + '}' : data.text;
						// add sample text to input type
						if (data.text !== data.alias) {
							if (jovoIntent.inputs) {
								for (const input of jovoIntent.inputs) {
									if (input.name === data.alias) {
										input.text = data.text;
									}
								}
							}
						}
					}
					// @ts-ignore
					jovoIntent.phrases.push(phrase);
				}
			}

			// @ts-ignore
			jovoModel.intents.push(jovoIntent);
		}
		if (fs.existsSync(DialogFlowUtil.getEntitiesFolderPath())) {
			const entitiesFiles = fs.readdirSync(DialogFlowUtil.getEntitiesFolderPath());
			// iterate through entity files
			for (const file of entitiesFiles) {
				// skip entries files
				if (file.indexOf('entries') > -1) {
					continue;
				}
				const dialogFlowEntity = require(
					DialogFlowUtil.getEntitiesFolderPath() + pathSep + file
				);
				const jovoInput: InputType = {
					name: dialogFlowEntity.name,
				};
				// skip default intent properties
				JovoCliPlatformGoogle.skipDefaultEntityProps(jovoInput, dialogFlowEntity);
				// iterate through usersays intent files and generate sample phrases
				const entriesFilePath = DialogFlowUtil.getEntitiesFolderPath() + pathSep + dialogFlowEntity.name + '_entries_' + locale + '.json';
				if (fs.existsSync(entriesFilePath)) {
					const values = [];
					const entries = require(entriesFilePath);

					for (const entry of entries) {
						const value = {
							value: entry.value,
							synonyms: [],
						};
						for (const synonym of entry.synonyms) {
							if (synonym === entry.value) {
								continue;
							}
							// @ts-ignore
							value.synonyms.push(synonym);
						}
						// @ts-ignore
						values.push(value);
					}
					if (values.length > 0) {
						jovoInput.values = values;
					}
				}


				// @ts-ignore
				jovoModel.inputTypes.push(jovoInput);
			}
		}

		// @ts-ignore
		if (jovoModel.inputTypes.length === 0) {
			delete jovoModel.inputTypes;
		}

		return jovoModel;
	}

    /**
     * Creates files (agent, intents, entities)
     * @param {*} locale
     * @param {String} stage
     */
	transform(locale: string, stage: string | undefined) {
		// this.config.locale = locale;
		// create dialog flow folder
		if (!fs.existsSync(DialogFlowUtil.getPath())) {
			fs.mkdirSync(DialogFlowUtil.getPath());
		}

		if (!fs.existsSync(DialogFlowUtil.getIntentsFolderPath())) {
			fs.mkdirSync(DialogFlowUtil.getIntentsFolderPath());
		}

		let outputLocale = locale.toLowerCase();

		if (['pt-br', 'zh-cn', 'zh-hk', 'zh-tw'].indexOf(outputLocale) === -1) {
			const primLanguage = project.getLocales().filter((lang: string) => {
				return locale.substr(0, 2) === lang.substr(0, 2);
			});
			if (primLanguage.length === 1) {
				outputLocale = locale.substr(0, 2);
			}
		}

		let model;
		try {
			model = project.getModel(locale);
		} catch (e) {
			return;
		}

		const concatArrays = function customizer(objValue: any[], srcValue: any) { // tslint:disable-line
			if (_.isArray(objValue)) {
				return objValue.concat(srcValue);
			}
		};

		if (project.getConfigParameter(`languageModel.${locale}`, stage)) {
			model = _.mergeWith(
				model,
				project.getConfigParameter(`languageModel.${locale}`, stage),
				concatArrays);
		}
		if (project.getConfigParameter(
			`googleAction.dialogflow.languageModel.${locale}`, stage)) {
			model = _.mergeWith(
				model,
				project.getConfigParameter(
					`googleAction.dialogflow.languageModel.${locale}`, stage),
				concatArrays);
		}

		for (const intent of model.intents) {
			const intentPath = DialogFlowUtil.getIntentsFolderPath() + intent.name + '.json';
			const dfIntentObj: DialogFlowLMInputObject = {
				'name': intent.name,
				'auto': true,
				'webhookUsed': true,
			};

			// handle intent inputs
			if (intent.inputs) {
				dfIntentObj.responses = [{
					parameters: [],
				}];

				for (const input of intent.inputs) {
					let parameterObj: DialogFlowLMInputParameterObject = {
						isList: false,
						name: input.name,
						value: '$' + input.name,
						dataType: ''
					};
					if (typeof input.type === 'object') {
						if (input.type.dialogflow) {
							if (_.startsWith(input.type.dialogflow, BUILTIN_PREFIX)) {
								parameterObj.dataType = input.type.dialogflow;
							} else {
								input.type = input.type.dialogflow;
							}
						} else {
							throw new Error('Please add a dialogflow property for input "' + input.name + '"');
						}
					}
					// handle custom input types
					if (parameterObj.dataType === '') {
						if (!input.type) {
							throw new Error('Invalid input type in intent "' + intent.name + '"');
						}
						parameterObj.dataType = input.type;
						// throw error when no inputTypes object defined
						if (!model.inputTypes) {
							throw new Error('Input type "' + parameterObj.dataType + '" must be defined in inputTypes');
						}

						// find type in global inputTypes array
						const matchedInputTypes = model.inputTypes.filter((item: InputType) => {
							return item.name === parameterObj.dataType;
						});

						parameterObj.dataType = '@' + parameterObj.dataType;


						if (matchedInputTypes.length === 0) {
							throw new Error('Input type "' + parameterObj.dataType + '" must be defined in inputTypes');
						}

						// create entities folders + files
						if (!fs.existsSync(DialogFlowUtil.getEntitiesFolderPath())) {
							fs.mkdirSync(DialogFlowUtil.getEntitiesFolderPath());
						}
						// create alexaTypeObj from matched input types
						for (const matchedInputType of matchedInputTypes) {
							let dfEntityObj = {
								name: matchedInputType.name,
								isOverridable: true,
								isEnum: false,
								automatedExpansion: false,
							};

							if (matchedInputType.dialogflow) {
								if (typeof matchedInputType.dialogflow === 'string') {
									dfEntityObj.name = matchedInputType.dialogflow;
								} else {
									dfEntityObj = _.merge(dfEntityObj, matchedInputType.dialogflow);
								}
							}

							const entityFilePath = DialogFlowUtil.getEntitiesFolderPath() + matchedInputType.name + '.json';
							fs.writeFileSync(entityFilePath,
								JSON.stringify(dfEntityObj, null, '\t')
							);

							// create entries if matched input type has values
							if (matchedInputType.values && matchedInputType.values.length > 0) {
								const entityValues = [];
								// create dfEntityValueObj
								for (const value of matchedInputType.values) {


									const dfEntityValueObj = {
										value: value.value,
										synonyms: [value.value.replace(/[^0-9A-Za-zÀ-ÿ-_ ]/gi, '')],
									};

									// save synonyms, if defined
									if (value.synonyms) {

										for (let i = 0; i < value.synonyms.length; i++) {
											value.synonyms[i] = value.synonyms[i].replace(/[^0-9A-Za-zÀ-ÿ-_ ]/gi, '');
										}

										dfEntityValueObj.synonyms =
											dfEntityValueObj.synonyms.concat(
												value.synonyms
											);
									}
									// @ts-ignore
									entityValues.push(dfEntityValueObj);
								}
								const entityEntriesFilePath = DialogFlowUtil.getEntitiesFolderPath() + matchedInputType.name + '_entries_' + outputLocale + '.json';
								fs.writeFileSync(entityEntriesFilePath,
									JSON.stringify(entityValues, null, '\t')
								);
							}
						}
					}

					// merges dialogflow specific data
					if (input.dialogflow) {
						parameterObj = _.merge(parameterObj, input.dialogflow);
					}

					dfIntentObj.responses[0].parameters.push(parameterObj);
				}
			}

			if (_.get(intent, 'dialogflow')) {
				_.merge(dfIntentObj, intent.dialogflow);
			}

			fs.writeFileSync(intentPath, JSON.stringify(dfIntentObj, null, '\t'));


			// handle user says files for intent

			const dialogFlowIntentUserSays: DialogFlowLMIntent[] = [];
			const re = /{(.*?)}/g;

			const phrases = intent.phrases || [];
			// iterate through phrases and intent user says data objects
			for (const phrase of phrases) {
				let m;
				let data: DialogFlowLMIntentData[] = [];
				let pos = 0;

				while (true) {
					m = re.exec(phrase);
					if (!m) {
						break;
					}

					// text between entities
					const text = phrase.substr(pos, m.index - pos);

					// entities
					const entity = phrase.substr(m.index + 1, m[1].length);

					pos = m.index + 1 + m[1].length + 1;


					const dataTextObj = {
						text,
						userDefined: false,
					};


					// skip empty text on entity index = 0
					if (text.length > 0) {
						data.push(dataTextObj);
					}

					const dataEntityObj: DialogFlowLMIntentData = {
						text: entity,
						userDefined: true,
					};

					// add enityt sample text if available
					if (intent.inputs) {
						for (const input of intent.inputs) {
							if (input.name === entity && input.text) {
								dataEntityObj.text = input.text;
							}
						}
					}


					// create entity object based on parameters objects
					if (_.get(dfIntentObj, 'responses[0].parameters')) {
						// @ts-ignore
						dfIntentObj.responses[0].parameters.forEach((item) => {
							if (item.name === entity) {
								dataEntityObj.alias = item.name;
								dataEntityObj.meta = item.dataType;
							}
						});
					}

					data.push(dataEntityObj);
				}

				if (pos < phrase.length) {
					data.push({
						text: phrase.substr(pos),
						userDefined: false,
					});
				}

				// if no entities in phrase use full phrase as data object
				if (data.length === 0) {
					data = [
						{
							text: phrase,
							userDefined: false,
						},
					];
				}

				dialogFlowIntentUserSays.push({
					data,
					isTemplate: false,
					count: 0,
				});
			}
			if (dialogFlowIntentUserSays.length > 0) {
				const intentUserSaysFilePath = DialogFlowUtil.getIntentsFolderPath() + intent.name + '_usersays_' + outputLocale + '.json';
				fs.writeFileSync(intentUserSaysFilePath, JSON.stringify(dialogFlowIntentUserSays, null, '\t'));
			}
		}
		// dialogflow intents form locale.json
		if (_.get(model, 'dialogflow.intents')) {
			for (const modelDialogflowIntent of _.get(model, 'dialogflow.intents')) {
				const path = DialogFlowUtil.getIntentsFolderPath() + pathSep + modelDialogflowIntent.name + '.json';
				fs.writeFileSync(path, JSON.stringify(modelDialogflowIntent, null, '\t'));
				// user says
				if (modelDialogflowIntent.userSays) {
					const pathUserSays = DialogFlowUtil.getIntentsFolderPath() + pathSep + modelDialogflowIntent.name + '_usersays_' + outputLocale + '.json';
					fs.writeFileSync(pathUserSays, JSON.stringify(modelDialogflowIntent.userSays, null, '\t'));
					delete modelDialogflowIntent.userSays;
				}
			}
		}

		// dialogflow entities form locale.json
		if (_.get(model, 'dialogflow.entities')) {
			// create entities folders + files
			if (!fs.existsSync(DialogFlowUtil.getEntitiesFolderPath())) {
				fs.mkdirSync(DialogFlowUtil.getEntitiesFolderPath());
			}
			for (const modelDialogflowEntity of _.get(model, 'dialogflow.entities')) {
				const path = DialogFlowUtil.getEntitiesFolderPath() + pathSep + modelDialogflowEntity.name + '.json';
				fs.writeFileSync(path, JSON.stringify(modelDialogflowEntity, null, '\t'));
				// entries
				if (modelDialogflowEntity.entries) {
					const pathEntries = DialogFlowUtil.getEntitiesFolderPath() + pathSep + modelDialogflowEntity.name + '_usersays_' + outputLocale + '.json';
					fs.writeFileSync(pathEntries, JSON.stringify(modelDialogflowEntity.entries, null, '\t'));
					delete modelDialogflowEntity.entries;
				}
			}
		}
	}

}
