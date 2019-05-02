import {
	AppFile,
	JovoTaskContext,
} from 'jovo-cli-core';


export interface AlexaEventSubscription {
	eventName: string;
}


export interface AlexaManifest {
	events?: {
		endpoint?: {
			uri: string;
		};
	};
	subscriptions?: AlexaEventSubscription[];
}


export interface AppFileAlexa extends AppFile {
	alexaSkill?: {
		nlu?: {
			name: string;
		}
		manifest?: AlexaManifest;
	};
}


export interface AskSkillList {
	skills: [
		{
			skillId: string;
			stage: string | undefined;
			nameByLocale: {
				[key: string]: string
			};
			lastUpdated: string;
		}
	];
}


export interface JovoTaskContextAlexa extends JovoTaskContext {
	askProfile: string;
	lambdaArn?: string;
	newSkill?: boolean;
}
