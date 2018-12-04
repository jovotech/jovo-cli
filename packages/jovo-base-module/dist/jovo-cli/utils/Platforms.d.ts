import Vorpal = require('vorpal');
import { Args } from "vorpal";
import { JovoCliPlatform } from 'jovo-cli-core';
export declare function getAllAvailable(): string[];
export declare function getAll(platform?: string, stage?: string): string[];
export declare function get(name: string): JovoCliPlatform;
export declare function addCliOptions(command: string, vorpalCommand: Vorpal.Command): void;
export declare function validateCliOptions(command: string, args: Args): boolean;
