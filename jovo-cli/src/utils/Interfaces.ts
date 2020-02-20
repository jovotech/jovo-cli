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
  [key: string]: string;
}

export interface PackageVersionsNpm {
  [key: string]: {
    local: string;
    npm: string;
  };
}

declare module 'listr' {
  interface ListrOptions {
    clearOutput?: boolean;
    collapse?: boolean;
    showSubtasks?: boolean;
    seperateTopTasks?: boolean;
  }
}
