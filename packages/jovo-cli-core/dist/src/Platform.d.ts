import { AppFile, JovoCliDeploy, JovoModel, JovoTaskContext, Project } from './';
import { ListrTask } from 'listr';
import * as inquirer from 'inquirer';
import Vorpal = require('vorpal');
import { ArgOptions } from './Interfaces';
export declare class JovoCliPlatform {
    static PLATFORM_KEY: string;
    constructor();
    getPlatformConfigIds(project: Project, argOptions: ArgOptions): object;
    getPlatformConfigValues(project: Project, argOptions: ArgOptions): object;
    getExistingProjects(config: AppFile): Promise<inquirer.ChoiceType[]>;
    getAdditionalCliOptions(command: string, vorpalCommand: Vorpal.Command): void;
    validateAdditionalCliOptions(command: string, args: Vorpal.Args): boolean;
    getLocales(locale?: string | string[]): string[];
    getBuildReverseTasks(ctx: JovoTaskContext): ListrTask[];
    getBuildTasks(ctx: JovoTaskContext): ListrTask[];
    getDeployTasks(ctx: JovoTaskContext, targets: JovoCliDeploy[]): ListrTask[];
    getGetTasks(ctx: JovoTaskContext): ListrTask[];
    hasPlatform(): boolean;
    setPlatformDefaults(model: JovoModel): JovoModel;
    addPlatfromToConfig(config: AppFile): AppFile;
    getPath(): string;
}
