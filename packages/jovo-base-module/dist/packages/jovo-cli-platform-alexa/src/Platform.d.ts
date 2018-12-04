import * as inquirer from 'inquirer';
import Vorpal = require('vorpal');
import { ArgOptions, Intent, JovoCliDeploy, JovoModel, JovoCliPlatform, Project } from 'jovo-cli-core';
import { ListrTask } from 'listr';
import { AppFileAlexa, JovoModelAlexa, JovoTaskContextAlexa } from '.';
export declare class JovoCliPlatformAlexa extends JovoCliPlatform {
    static PLATFORM_KEY: string;
    constructor();
    getPlatformConfigIds(project: Project, argOptions: ArgOptions): object;
    getPlatformConfigValues(project: Project, argOptions: ArgOptions): object;
    getExistingProjects(config: JovoTaskContextAlexa): Promise<inquirer.ChoiceType[]>;
    getAdditionalCliOptions(command: string, vorpalCommand: Vorpal.Command): void;
    validateAdditionalCliOptions(command: string, args: Vorpal.Args): boolean;
    hasPlatform(): boolean;
    setPlatformDefaults(model: JovoModelAlexa): JovoModel;
    addPlatfromToConfig(config: AppFileAlexa): AppFileAlexa;
    isValidAskProfile(askProfile: string): boolean;
    getDefaultIntents(): Intent[];
    getBuildTasks(ctx: JovoTaskContextAlexa): ListrTask[];
    getGetTasks(ctx: JovoTaskContextAlexa): ListrTask[];
    getBuildReverseTasks(ctx: JovoTaskContextAlexa): ListrTask[];
    getDeployTasks(ctx: JovoTaskContextAlexa, targets: JovoCliDeploy[]): ListrTask[];
    getModelsPath(): string;
    getModelPath(locale: string): string;
    getLocales(locale?: string | string[]): string[];
    getAccountLinkingPath(): string;
    getSkillId(): any;
    getSkillJsonPath(): string;
    getAskConfigFolderPath(): string;
    getAskConfigPath(): string;
    getSkillJson(): any;
    getAskConfig(): any;
    getModel(locale: string): any;
    createEmptySkillJson(skillName: string, locales: string[] | undefined): {
        'manifest': {
            'publishingInformation': {
                'locales': {};
                'isAvailableWorldwide': boolean;
                'testingInstructions': string;
                'category': string;
                'distributionCountries': never[];
            };
            'apis': {};
            'manifestVersion': string;
        };
    };
    createEmptyModelJson(): {
        'interactionModel': {
            'languageModel': {};
        };
    };
    createAlexaSkill(ctx: JovoTaskContextAlexa): Promise<{}>;
    buildLanguageModelAlexa(locale: string, stage: string): Promise<{}>;
    buildSkillAlexa(stage: string): Promise<{}>;
    getSkillIdPromise(): Promise<{}>;
    getSkillInformation(): {
        name: string;
        invocationName: string;
        skillId: any;
        endpoint: any;
    };
    getSkillSimpleInformation(): {
        name: string;
        skillId: any;
        endpoint: any;
    };
    isLambdaEndpoint(): boolean;
    getInvocationName(locale: string): any;
    setAlexaSkillId(skillId: string): Promise<{}>;
}
