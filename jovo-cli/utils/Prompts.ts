import * as inquirer from 'inquirer';

export const ANSWER_OVERWRITE = 'overwrite';
export const ANSWER_UPDATE = 'update';
export const ANSWER_CANCEL = 'cancel';
export const ANSWER_BACKUP = 'backup';


/**
 * Asks for platform
 * @return {Promise}
 */
export function promptForPlatform(): Promise<inquirer.Answers> {
	const questions = [
		{
			type: 'list',
			name: 'platform',
			message: 'Choose your platform',
			choices: [{
				value: 'alexaSkill',
				name: 'Alexa Skill (alexaSkill)',
			}, {
				value: 'googleAction',
				name: 'GoogleAction with DialogFlow (googleAction)',
			},
			],
		},
	];
	return inquirer.prompt(questions);
}


/**
 * Asks for platform
 * @return {Promise}
 */
export function promptForInit(message: string): Promise<inquirer.Answers> {
	const questions = [
		{
			type: 'list',
			name: 'platform',
			message,
			choices: [{
				value: 'alexaSkill',
				name: 'Alexa Skill (alexaSkill)',
			}, {
				value: 'googleAction',
				name: 'GoogleAction with DialogFlow (googleAction)',
			},
			],
		},
	];
	return inquirer.prompt(questions);
}


/**
 * Asks for Skill ID (list)
 * @param {Array<*>} choices
 * @return {Promise}
 */
export function promptListForSkillId(choices: inquirer.ChoiceType[]): Promise<inquirer.Answers> {
	const questions = [{
		type: 'list',
		name: 'skillId',
		message: 'Select your skill:',
		paginated: true,
		choices,
	}];
	return inquirer.prompt(questions);
}


/**
 * Asks for overwrite confirmation
 * @return {*}
 */
export function promptOverwriteProject(): Promise<inquirer.Answers> {
	const questions = [
		{
			type: 'list',
			name: 'overwrite',
			message: 'There is a folder with a same name. What would you like to do?',
			choices: [{
				value: ANSWER_OVERWRITE,
				name: 'Overwrite',
			}, {
				value: ANSWER_CANCEL,
				name: 'Cancel',
			},
			],
		},
	];
	return inquirer.prompt(questions);
}


/**
 * Asks for overwrite confirmation
 * @return {*}
 */
export function promptUpdateVersions(numPackages: number): Promise<inquirer.Answers> {
	const questions = [
		{
			type: 'list',
			name: 'update',
			message: `Currently ${numPackages} packages are out of date. What would you like to do?`,
			choices: [{
				value: ANSWER_UPDATE,
				name: 'Update all packages to the newest version',
			}, {
				value: ANSWER_CANCEL,
				name: 'Cancel',
			},
			],
		},
	];
	return inquirer.prompt(questions);
}


/**
 * Ask for overwrite project files confirmation
 * @return {*}
 */
export function promptOverwriteProjectFiles(): Promise<inquirer.Answers> {
	const questions = [
		{
			type: 'list',
			name: 'overwrite',
			message: 'Found existing project files. How to proceed?',
			choices: [{
				value: ANSWER_OVERWRITE,
				name: 'Overwrite',
			}, {
				value: ANSWER_CANCEL,
				name: 'Cancel',
			},
			],
		},
	];
	return inquirer.prompt(questions);
}


/**
 * Ask for overwrite Alexa Skill files confirmation
 * @return {*}
 */
export function promptOverwriteReverseBuild(): Promise<inquirer.Answers> {
	const questions = [
		{
			type: 'list',
			name: 'promptOverwriteReverseBuild',
			message: 'Found existing model files. How to proceed?',
			choices: [{
				value: ANSWER_OVERWRITE,
				name: 'Overwrite',
			}, {
				value: ANSWER_BACKUP,
				name: 'Backup old file and proceed',
			}, {
				value: ANSWER_CANCEL,
				name: 'Cancel',
			},
			],
		},
	];
	return inquirer.prompt(questions);
}


/**
 * Ask for project directory name
 * @return {*}
 */
export function promptNewProject(): Promise<inquirer.Answers> {
	const questions = [
		{
			type: 'input',
			name: 'directory',
			message: 'Missing argument <directory>. How do you want to name your Jovo project?',
		},
	];
	return inquirer.prompt(questions);
}
