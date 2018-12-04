import * as Listr from 'listr';
import { JovoTaskContext } from 'jovo-cli-core';
export declare function initTask(): {
    title: string;
    task: (ctx: JovoTaskContext, task: Listr.ListrTaskWrapper) => Listr;
};
export declare function getTask(ctx: JovoTaskContext): Listr.ListrTask[];
export declare function buildTask(ctx: JovoTaskContext): Listr.ListrTask[];
export declare function buildReverseTask(ctx: JovoTaskContext): Listr;
export declare function deployTask(ctx: JovoTaskContext): Listr.ListrTask[];
