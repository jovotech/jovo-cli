import * as Listr from 'listr';
export interface ListrOptionsExtended extends Listr.ListrOptions {
    clearOutput: boolean;
    collapse: boolean;
    showSubtasks: boolean;
}
export interface ListrTaskHelper {
    title: string;
    output: string;
    spinner?: () => string;
    isEnabled(): boolean;
    isCompleted(): boolean;
    hasFailed(): boolean;
    isPending(): boolean;
    isSkipped(): boolean;
    subtasks: ListrTaskHelper[];
}
