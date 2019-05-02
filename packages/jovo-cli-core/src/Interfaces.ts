import {
	JovoConfig,
} from 'jovo-config';

export interface ArgOptions {
	[key: string]: string;
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
	projectname?: string;
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
}


export interface PackageVersion {
	major: number;
	minor: number;
	patch: number;
}
