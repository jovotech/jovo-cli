import { ListrTask } from 'listr';
import { JovoCliDeploy } from 'jovo-cli-core';
import { JovoTaskContextLambda } from '.';
export declare class JovoCliDeployLambda extends JovoCliDeploy {
    static TARGET_KEY: string;
    constructor();
    execute(ctx: JovoTaskContextLambda, project: any): ListrTask[];
    upload(ctx: JovoTaskContextLambda): Promise<void>;
    checkAsk(): Promise<void>;
    updateFunction(lambda: any, pathToZip: any, lambdaArn: any, lambdaParams: any): Promise<void>;
    deleteLambdaZip(pathToZip: any): Promise<{}>;
    zipSrcFolder(pathToZip: any, src: any): Promise<{}>;
    getAWSCredentialsFromAskProfile(askProfile: any): any;
}
