import * as Listr from 'listr';

// The Listr interface definitions are incomplete so add own
// ones temporary here
export interface ListrOptionsExtended extends Listr.ListrOptions {
	clearOutput: boolean;
	collapse: boolean;
	showSubtasks: boolean;
	separateTopTasks: boolean;
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

export interface PackageVersions {
	[key: string]: string;
}

export interface PackageVersionsNpm {
	[key: string]: {
		local: string;
		npm: string;
	};
}