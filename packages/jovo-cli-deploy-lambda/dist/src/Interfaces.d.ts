import { JovoTaskContext } from 'jovo-cli-core';
export interface JovoTaskContextLambda extends JovoTaskContext {
    stage?: string;
    awsProfile: string;
    askProfile: string;
    src: string;
    lambdaArn: string;
    awsConfig: object;
    lambdaConfig: object;
}
