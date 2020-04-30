import * as AWS from 'aws-sdk';
import * as _ from 'lodash';
import * as path from 'path';
import * as fs from 'fs';
import { ListrTask } from 'listr';
import { execSync } from 'child_process';
const proxyAgent = require('proxy-agent');

import { JovoCliDeploy, Utils, Project, TARGET_ZIP, JovoCliError, ERROR_TYPE } from 'jovo-cli-core';
import { JovoTaskContextLambda } from '.';

export class JovoCliDeployLambda extends JovoCliDeploy {
  static TARGET_KEY = 'lambda';
  static PRE_DEPLOY_TASKS = [TARGET_ZIP];

  constructor() {
    super();
  }

  execute(ctx: JovoTaskContextLambda, project: Project): ListrTask[] {
    const config = project.getConfig(ctx.stage);

    let arn = _.get(config, 'alexaSkill.host.lambda.arn') || _.get(config, 'host.lambda.arn');

    if (!arn) {
      arn = _.get(config, 'alexaSkill.endpoint') || _.get(config, 'endpoint');
      arn = _.startsWith(arn, 'arn') ? arn : undefined;
    }

    return [
      {
        title: 'Uploading to AWS Lambda',
        enabled: (ctx: JovoTaskContextLambda) =>
          (!ctx.newSkill && _.isUndefined(arn) === false) ||
          // If specifically lambda got defined to be the target execute
          // even when no arn is defined. So that we can display an error
          // so that user knows exactly what is wrong
          (_.isUndefined(arn) === true && ctx.targets!.includes('lambda')),
        task: async (ctx: JovoTaskContextLambda, task) => {
          try {
            if (_.isUndefined(arn)) {
              const errorMessage = 'Please add a Lambda Endpoint to your project.js file.';
              return Promise.reject(new JovoCliError(errorMessage, 'jovo-cli-deploy-lambda'));
            }

            const projectConfig = project.getConfig(ctx.stage);
            ctx.lambdaArn = arn;

            // special use case
            // copy app.json/project.js if src directory is not default and config
            // was set in projectConfig
            if (
              project.jovoConfigReader!.getConfigParameter('src', ctx.stage) &&
              projectConfig.config
            ) {
              await project.moveTempJovoConfig(
                project.jovoConfigReader!.getConfigParameter('src', ctx.stage) as string,
              );
            }

            this.checkAsk();
            await this.upload(ctx, project);

            if (
              project.jovoConfigReader!.getConfigParameter('src', ctx.stage) &&
              projectConfig.config
            ) {
              await project.deleteTempJovoConfig(
                project.jovoConfigReader!.getConfigParameter('src', ctx.stage) as string,
              );
            }

            let info = 'Info: ';

            info += `Deployed to lambda function: ${arn}`;
            task.skip(info);

            return Promise.resolve();
          } catch (err) {
            if (err instanceof JovoCliError) {
              throw err;
            }
            throw new JovoCliError(err.message, 'jovo-cli-deploy-lambda');
          }
        },
      },
    ];
  }

  async upload(ctx: JovoTaskContextLambda, project: Project): Promise<void> {
    ctx.src = ctx.src.replace(/\\/g, '\\\\');

    if (
      process.env.AWS_ACCESS_KEY_ID === undefined ||
      process.env.AWS_SECRET_ACCESS_KEY === undefined
    ) {
      // Only set profile when special AWS environment variables are not set

      let awsProfile = 'default';
      if (ctx.askProfile) {
        awsProfile = this.getAWSCredentialsFromAskProfile(ctx.askProfile);
      }
      if (ctx.awsProfile) {
        awsProfile = ctx.awsProfile;
      }

      AWS.config.credentials = new AWS.SharedIniFileCredentials({ profile: awsProfile });
    }

    const region = ctx.lambdaArn.match(/([a-z]{2})-([a-z]{4})([a-z]*)-\d{1}/g);
    if (!region) {
      return Promise.reject(
        new JovoCliError(`No region found in "${ctx.lambdaArn}"!`, 'jovo-cli-deploy-lambda'),
      );
    }
    AWS.config.region = region[0];

    const proxyServer =
      process.env.http_proxy ||
      process.env.HTTP_PROXY ||
      process.env.https_proxy ||
      process.env.HTTPS_PROXY;

    if (proxyServer) {
      AWS.config.update({
        httpOptions: {
          agent: proxyAgent(proxyServer),
        },
      });
    }

    const lambda = new AWS.Lambda(ctx.awsConfig || {});

    const pathToZip = await project.getZipBundlePath(ctx);

    await this.updateFunction(lambda, pathToZip, ctx.lambdaArn, ctx.lambdaConfig || {});

    return this.deleteLambdaZip(pathToZip);
  }

  /**
   * Checks if ask cli is installed and returns version.
   * @return {Promise<any>}
   */
  checkAsk() {
    try {
      // Check for ask-cli@v2
      const version = execSync('ask -V').toString();
      return version[0];
    } catch (err) {
      try {
        // If ask-cli@v2 fails, check for v1
        const version = execSync('ask -v').toString();
        return version[0];
      } catch (err) {
        throw new JovoCliError(
          'Jovo requires ASK CLI',
          'jovo-cli-platform-alexa',
          'Install the ask-cli with npm install ask-cli -g. Read more here: https://developer.amazon.com/docs/smapi/quick-start-alexa-skills-kit-command-line-interface.html',
          ERROR_TYPE.WARN,
        );
      }
    }
  }

  updateFunction(
    lambda: AWS.Lambda,
    pathToZip: string,
    lambdaArn: string,
    lambdaParams: object | undefined,
  ): Promise<void> {
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
    } catch (err) {
      throw new JovoCliError(err.message, 'jovo-cli-deploy-lambda');
    }
  }
}
