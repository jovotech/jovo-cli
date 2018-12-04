import Vorpal = require('vorpal');
import * as inquirer from 'inquirer';
import { ListrTask } from 'listr';
import { AppFileDialogFlow } from './';
import { AppFile, ArgOptions, InputType, JovoCliDeploy, JovoCliPlatform, JovoModel, Project } from 'jovo-cli-core';
import { DialogFlowLMInputObject, DialogFlowLMEntity, IntentDialogFlow, JovoTaskContextGoogle } from './';
export declare class JovoCliPlatformGoogle extends JovoCliPlatform {
    static PLATFORM_KEY: string;
    constructor();
    getPlatformConfigIds(project: Project, argOptions: ArgOptions): object;
    getPlatformConfigValues(project: Project, argOptions: ArgOptions): object;
    getExistingProjects(config: AppFile): Promise<inquirer.ChoiceType[]>;
    getAdditionalCliOptions(command: string, vorpalCommand: Vorpal.Command): void;
    validateAdditionalCliOptions(command: string, args: Vorpal.Args): boolean;
    hasPlatform(): boolean;
    getLocales(locale?: string | string[]): string[];
    setPlatformDefaults(model: JovoModel): JovoModel;
    addPlatfromToConfig(config: AppFileDialogFlow): AppFileDialogFlow;
    getBuildTasks(ctx: JovoTaskContextGoogle): ListrTask[];
    getGetTasks(ctx: JovoTaskContextGoogle): ListrTask[];
    getBuildReverseTasks(ctx: JovoTaskContextGoogle): ListrTask[];
    getDeployTasks(ctx: JovoTaskContextGoogle, targets: JovoCliDeploy[]): ListrTask[];
    static skipDefaultIntentProps(jovoIntent: IntentDialogFlow, dialogFlowIntent: DialogFlowLMInputObject, locale: string): IntentDialogFlow;
    static skipDefaultEntityProps(jovoInput: InputType, dialogflowEntity: DialogFlowLMEntity): InputType;
    reverse(locale: string): JovoModel;
    transform(locale: string, stage: string | undefined): void;
}
