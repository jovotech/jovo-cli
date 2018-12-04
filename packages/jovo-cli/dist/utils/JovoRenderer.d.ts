/// <reference types="node" />
import * as Listr from 'listr';
import { ListrTaskHelper, ListrOptionsExtended } from '../src';
export declare class JovoCliRenderer implements Listr.ListrRenderer {
    _id: NodeJS.Timer | undefined;
    _options: ListrOptionsExtended;
    _tasks: ListrTaskHelper[];
    nonTTY: boolean;
    constructor(tasks?: never[], options?: {});
    render(): void;
    end(err?: Error): void;
}
