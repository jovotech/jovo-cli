import { ListrTaskHelper, ListrOptionsExtended } from '../src';
import Vorpal = require('vorpal');
export declare function isDefined(x: any): boolean;
export declare function getSymbol(task: ListrTaskHelper, options: ListrOptionsExtended): any;
export declare function deleteFolderRecursive(filepath: string): void;
export declare function addBaseCliOptions(vorpalInstance: Vorpal.Command): void;
