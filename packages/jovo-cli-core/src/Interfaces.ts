export interface ArgOptions {
	[key: string]: string;
}

export interface LanguageModel {
	[key: string]: {
		invocation: string;
	};
}

export interface AppFileStages {
	endpoint?: string;
	languageModel?: LanguageModel;
}

export interface AppFile {
	config?: {
		[key: string]: object;
	};
	endpoint?: string;
	stages?: {
		[key: string]: AppFileStages;
	};
	deploy?: DeployConfiguration;
}

export interface DeployConfiguration {
	target?: string[];
}

export interface IntentInput {
	name: string;
	text?: string;
	type?: string | {
		[key: string]: string;
	};
}

export interface InputTypeValue {
	value: string;
	id?: string;
	synonyms?: string[];
}


export interface InputType {
	name: string;
	values?: InputTypeValue[];
}


export interface Intent {
	name: string;
	phrases?: string[];
	samples?: string[];
	inputs?: IntentInput[];
}

export interface GenericData {
	[key: string]: string | number | GenericData | object;
}


export interface JovoModel {
	// [key: string]: any; // For platform keys like "alexa"
	invocation: string;
	inputTypes?: InputType[];
	intents?: Intent[];
}


export interface JovoTaskContext {
	types: string[];
	// skillId?: string[];
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

export interface JovoConfig {
	webhook: {
		uuid: string;
	};
}


export interface PackageVersion {
	major: number;
	minor: number;
	patch: number;
}

// export interface JovoCliPlatform {
// 	setPlatformDefaults(model: JovoModel): Promise<void>;
// 	updateModelPlatformDefault(model: JovoModel): JovoModel;
// }
