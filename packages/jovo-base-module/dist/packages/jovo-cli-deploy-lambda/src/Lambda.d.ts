import * as AWS from 'aws-sdk';
import { ListrTask } from 'listr';
import { JovoCliDeploy, Project } from 'jovo-cli-core';
import { JovoTaskContextLambda } from '.';
export declare class JovoCliDeployLambda extends JovoCliDeploy {
    static TARGET_KEY: string;
    constructor();
    execute(ctx: JovoTaskContextLambda, project: Project): ListrTask[];
    upload(ctx: JovoTaskContextLambda): Promise<void>;
    checkAsk(): Promise<void>;
    updateFunction(lambda: AWS.Lambda, pathToZip: string, lambdaArn: string, lambdaParams: object | undefined): Promise<void>;
    deleteLambdaZip(pathToZip: string): Promise<{}>;
    zipSrcFolder(pathToZip: string, src: string): Promise<{}>;
    getAWSCredentialsFromAskProfile(askProfile: string): any;
}
