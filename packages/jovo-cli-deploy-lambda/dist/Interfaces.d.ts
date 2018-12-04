import { JovoTaskContext } from 'jovo-cli-core';
export interface JovoTaskContextLambda extends JovoTaskContext {
    awsProfile: string;
    askProfile: string;
    src: string;
    lambdaArn: string;
    awsConfig: object;
    lambdaConfig: object;
}
