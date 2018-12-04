import { AppFile, JovoCliDeploy, JovoModel, JovoTaskContext, Project } from 'jovo-cli-core';
import { ListrTask } from 'listr';
import { ArgOptions } from './Interfaces';
export declare class JovoCliPlatform {
    static PLATFORM_KEY: string;
    constructor();
    getPlatformConfigIds(project: Project, argOptions?: ArgOptions): object;
    getPlatformConfigValues(project: Project, argOptions?: ArgOptions): object;
    getExistingProjects(config: AppFile): Promise<object>;
    getAdditionalCliOptions(command: string, vorpalInstance: any): void;
    validateAdditionalCliOptions(command: string, args: any): boolean;
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
