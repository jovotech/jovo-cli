export interface ListrTaskHelper {
  title: string;
  output: string;
  spinner?: () => string;
  subtasks: ListrTaskHelper[];
  isEnabled(): boolean;
  isCompleted(): boolean;
  hasFailed(): boolean;
  isPending(): boolean;
  isSkipped(): boolean;
}

export interface PackageVersions {
  [key: string]: {
  	version: string;
  	dev: boolean;
  }
}

export interface PackageVersionsNpm {
  [key: string]: {
    local: string;
    dev: boolean;
    npm: string;
  };
}

export interface OutdatedPackages {
	name: string;
	dev: boolean;
}

export interface IScaffoldParameters {
  handler: string;
  type: string;
}

declare module 'listr' {
  interface ListrOptions {
    clearOutput?: boolean;
    collapse?: boolean;
    showSubtasks?: boolean;
    seperateTopTasks?: boolean;
  }
}
