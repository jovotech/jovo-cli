"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const AWS = require("aws-sdk");
const archiver = require("archiver");
const _ = require("lodash");
const path = require("path");
const fs = require("fs");
const child_process_1 = require("child_process");
const jovo_cli_core_1 = require("jovo-cli-core");
class JovoCliDeployLambda extends jovo_cli_core_1.JovoCliDeploy {
    constructor() {
        super();
    }
    execute(ctx, project) {
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
                        const appJson = project.getConfig(ctx.stage);
                        ctx.lambdaArn = arn;
                        let p = Promise.resolve();
                        if (project.getConfigParameter('src', ctx.stage) && appJson.config) {
                            p = p.then(() => project.moveTempJovoConfig(project.getConfigParameter('src', ctx.stage)));
                        }
                        p = p.then(() => this.checkAsk()).then(() => {
                            return this.upload(ctx);
                        });
                        if (project.getConfigParameter('src', ctx.stage) && appJson.config) {
                            p = p.then(() => project.deleteTempJovoConfig(project.getConfigParameter('src', ctx.stage)));
                        }
                        p = p.then(() => {
                            let info = 'Info: ';
                            info += `Deployed to lambda function: ${arn}`;
                            task.skip(info);
                        });
                        return p;
                    }
                    catch (err) {
                        throw err;
                    }
                },
            }
        ];
    }
    upload(ctx) {
        ctx.src = ctx.src.replace(/\\/g, '\\\\');
        return new Promise((resolve, reject) => {
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
                return reject(new Error(`No region foun in "${ctx.lambdaArn}"!`));
            }
            AWS.config.region = region[0];
            const lambda = new AWS.Lambda(ctx.awsConfig || {});
            const pathToZip = ctx.src + '/lambdaUpload.zip';
            return this.zipSrcFolder(pathToZip, ctx.src).then(() => {
                return this.updateFunction(lambda, pathToZip, ctx.lambdaArn, ctx.lambdaConfig || {});
            }).then((data) => {
                return this.deleteLambdaZip(pathToZip);
            }).then(() => {
                resolve();
            }).catch((err) => {
                reject(err);
            });
        });
    }
    checkAsk() {
        return new Promise((resolve, reject) => {
            child_process_1.exec('ask -v', (error, stdout) => {
                if (error) {
                    const msg = 'Jovo requires ASK CLI\n' +
                        'Please read more: https://developer.amazon.com/docs/smapi/quick-start-alexa-skills-kit-command-line-interface.html';
                    return reject(new Error(msg));
                }
                const version = stdout.split('.');
                if (parseInt(version[0], 10) >= 1 && parseInt(version[1], 10) >= 1) {
                    return resolve();
                }
                return reject(new Error('Please update ask-cli to version >= 1.1.0'));
            });
        });
    }
    updateFunction(lambda, pathToZip, lambdaArn, lambdaParams) {
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
                }
                else {
                    resolve();
                }
            });
        });
    }
    deleteLambdaZip(pathToZip) {
        return new Promise((resolve, reject) => {
            fs.unlink(pathToZip, (err) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve();
                }
            });
        });
    }
    zipSrcFolder(pathToZip, src) {
        return new Promise((resolve, reject) => {
            const output = fs.createWriteStream(pathToZip);
            const archive = archiver('zip', {
                zlib: {
                    level: 9,
                },
            });
            output.on('close', () => {
                resolve(pathToZip);
            });
            archive.on('error', (err) => {
                reject(err);
            });
            archive.pipe(output);
            archive.glob('**/*', {
                cwd: src,
                ignore: 'lambdaUpload.zip',
            });
            archive.finalize();
        });
    }
    getAWSCredentialsFromAskProfile(askProfile) {
        const askCliConfig = path.join(jovo_cli_core_1.Utils.getUserHome(), '.ask', 'cli_config');
        try {
            const data = fs.readFileSync(askCliConfig);
            const askProfiles = JSON.parse(data.toString()).profiles;
            for (const profileKey of Object.keys(askProfiles)) {
                const profile = askProfiles[profileKey];
                if (profileKey === askProfile && _.get(profile, 'aws_profile')) {
                    return _.get(profile, 'aws_profile');
                }
            }
        }
        catch (e) {
            throw e;
        }
    }
}
JovoCliDeployLambda.TARGET_KEY = 'lambda';
exports.JovoCliDeployLambda = JovoCliDeployLambda;
//# sourceMappingURL=Lambda.js.map