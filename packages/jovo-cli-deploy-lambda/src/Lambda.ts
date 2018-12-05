import * as AWS from 'aws-sdk';
import * as _ from 'lodash';
import * as path from 'path';
import * as fs from 'fs';
import { ListrTask } from 'listr';
import { exec } from 'child_process';

import { JovoCliDeploy, Utils, Project } from 'jovo-cli-core';
import { JovoTaskContextLambda } from '.';


export class JovoCliDeployLambda extends JovoCliDeploy {

	static TARGET_KEY = 'lambda';

	constructor() {
		super();
	}


	execute(ctx: JovoTaskContextLambda, project: Project): ListrTask[] {

		const globalConfig = project.getConfig();
		const stageConfig = _.get(project.getConfig(), `stages.${ctx.stage}`);

		let arn = _.get(stageConfig, 'alexaSkill.host.lambda.arn') ||
			_.get(stageConfig, 'host.lambda.arn') ||
			_.get(globalConfig, 'alexaSkill.host.lambda.arn') ||
			_.get(globalConfig, 'host.lambda.arn');

		if (!arn) {
			arn = _.get(stageConfig, 'alexaSkill.endpoint') ||
				_.get(stageConfig, 'endpoint') ||
				_.get(globalConfig, 'alexaSkill.endpoint') ||
				_.get(globalConfig, 'endpoint');
			arn = _.startsWith(arn, 'arn') ? arn : undefined;
		}

		return [
			{
				title: 'Uploading to lambda',
				enabled: (ctx) => !ctx.newSkill &&
					_.isUndefined(arn) === false,
				task: (ctx, task) => {
					try {
						const projectConfig = project.getConfig(ctx.stage);
						ctx.lambdaArn = arn;

						let p = Promise.resolve();

						// special use case
						// copy app.json/project.js if src directory is not default and config
						// was set in projectConfig
						if (project.getConfigParameter('src', ctx.stage) && projectConfig.config) {
							p = p.then(
								() => project.moveTempJovoConfig(project.getConfigParameter('src', ctx.stage) as string));
						}

						p = p.then(() => this.checkAsk()).then(() => {
							return this.upload(ctx, project);
						});

						if (project.getConfigParameter('src', ctx.stage) && projectConfig.config) {
							p = p.then(
								() => project.deleteTempJovoConfig(project.getConfigParameter('src', ctx.stage) as string));
						}

						p = p.then(() => {
							let info = 'Info: ';

							info += `Deployed to lambda function: ${arn}`;
							task.skip(info);
						});
						return p;
					} catch (err) {
						throw err;
					}
				},
			}
		];
	}


	async upload(ctx: JovoTaskContextLambda, project: Project): Promise<void> {
		ctx.src = ctx.src.replace(/\\/g, '\\\\');
		let awsProfile = 'default';

		if (ctx.askProfile) {
			awsProfile = this.getAWSCredentialsFromAskProfile(ctx.askProfile);
		}

		if (ctx.awsProfile) {
			awsProfile = ctx.awsProfile;
		}

		AWS.config.credentials = new AWS.SharedIniFileCredentials({ profile: awsProfile });

		const region = ctx.lambdaArn.match(/([a-z]{2})-([a-z]{4})([a-z]*)-\d{1}/g);
		if (!region) {
			return Promise.reject(new Error(`No region foun in "${ctx.lambdaArn}"!`));
		}
		AWS.config.region = region[0];

		const lambda = new AWS.Lambda(ctx.awsConfig || {});

		const pathToZip = await project.zipSrcFolder(ctx);

		await this.updateFunction(
			lambda,
			pathToZip,
			ctx.lambdaArn,
			ctx.lambdaConfig || {}
		);

		return this.deleteLambdaZip(pathToZip);
	}


	checkAsk(): Promise<void> {
		return new Promise((resolve, reject) => {
			exec('ask -v', (error, stdout: string) => {
				if (error) {
					const msg = 'Jovo requires ASK CLI\n' +
						'Please read more: https://developer.amazon.com/docs/smapi/quick-start-alexa-skills-kit-command-line-interface.html';
					return reject(new Error(msg));
				}
				const version: string[] = stdout.split('.');

				if (parseInt(version[0], 10) >= 1 && parseInt(version[1], 10) >= 1) {
					return resolve();
				}

				return reject(new Error('Please update ask-cli to version >= 1.1.0'));
			});
		});
	}


	updateFunction(lambda: AWS.Lambda, pathToZip: string, lambdaArn: string, lambdaParams: object | undefined): Promise<void> {
		return new Promise((resolve, reject) => {
			const zipdata = fs.readFileSync(pathToZip);

			let params = {
				FunctionName: lambdaArn,
				ZipFile: new Buffer(zipdata),
			};

			params = _.merge(params, lambdaParams);

			lambda.updateFunctionCode(params, (err, data) => {
				if (err) {
					reject(err);
				} else {
					resolve();
				}
			});
		});
	}


	deleteLambdaZip(pathToZip: string): Promise<void> {
		return new Promise((resolve, reject) => {
			fs.unlink(pathToZip, (err) => {
				if (err) {
					reject(err);
				} else {
					resolve();
				}
			});
		});
	}


	getAWSCredentialsFromAskProfile(askProfile: string) {
		const askCliConfig = path.join(Utils.getUserHome(), '.ask', 'cli_config');
		try {
			const data = fs.readFileSync(askCliConfig);
			const askProfiles = JSON.parse(data.toString()).profiles;

			for (const profileKey of Object.keys(askProfiles)) {
				const profile = askProfiles[profileKey];
				if (profileKey === askProfile && _.get(profile, 'aws_profile')) {
					return _.get(profile, 'aws_profile');
				}
			}
		} catch (e) {
			throw e;
		}

	}

}
