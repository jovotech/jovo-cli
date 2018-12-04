/// <reference types="node" />
import { JovoTaskContextGoogle } from '.';
export declare function getPath(): string;
export declare function getIntentsFolderPath(): string;
export declare function getEntitiesFolderPath(): string;
export declare function getPackageJsonPath(): string;
export declare function getPackageJson(): any;
export declare function getAgentJsonPath(): string;
export declare function getAgentJson(): any;
export declare function createEmptyAgentJson(): {
    description: string;
};
export declare function buildDialogFlowAgent(ctx: JovoTaskContextGoogle): Promise<{}>;
export declare function getDefaultIntents(): ({
    'name': string;
    'auto': boolean;
    'webhookUsed': boolean;
    'fallbackIntent': boolean;
    'events'?: undefined;
} | {
    'name': string;
    'auto': boolean;
    'webhookUsed': boolean;
    'events': {
        'name': string;
    }[];
    'fallbackIntent'?: undefined;
})[];
export declare function zip(): Promise<{}>;
export declare const v2: {
    checkGcloud(): Promise<void>;
    activateServiceAccount(config: JovoTaskContextGoogle): Promise<void>;
    getAccessToken(): Promise<string>;
    exportAgent(config: JovoTaskContextGoogle): Promise<Buffer>;
    restoreAgent(config: JovoTaskContextGoogle): Promise<void>;
    trainAgent(config: JovoTaskContextGoogle): Promise<{}>;
};
export declare function getAgentFiles(config: JovoTaskContextGoogle): Promise<void>;
