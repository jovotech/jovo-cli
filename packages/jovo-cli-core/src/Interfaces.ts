import { JovoConfig } from 'jovo-config';
import { IFlag as Flag } from '@oclif/command/lib/flags';

export interface InputFlags {
	[key: string]: Flag<any>;
}

export interface OutputFlags {
	[key: string]: string | boolean | undefined;
}

export interface GenericData {
	[key: string]: string | number | GenericData | object;
}

export interface AppFile extends JovoConfig {
	deploy?: DeployConfiguration;
	endpoint?: string;
}

export interface DeployConfiguration {
	target?: string[];
}

export interface JovoTaskContext {
	types: string[];
	skillId?: string;
	locales?: string[];
	projectId?: string;
	endpoint?: string;
	targets?: string[];
	projectName?: string;
	template?: string;
	src?: string;
	stage?: string;
	reverse?: boolean;
	debug?: boolean;
	frameworkVersion?: number;
	ignoreTasks?: string[];
}

export interface JovoUserConfig {
	webhook: {
		uuid: string;
	};
	timeLastUpdateMessage?: string | number;
}

export interface PackageVersion {
	major: number;
	minor: number;
	patch: number;
}
