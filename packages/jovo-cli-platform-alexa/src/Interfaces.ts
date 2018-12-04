import { AppFile, IntentInput, InputType, JovoTaskContext, JovoModel } from 'jovo-cli-core';


export interface AlexaLMInputObject {
	name: string;
	type: string | {
		[key: string]: string;
	};
	alexaInputObjtype?: string;
}

export interface AlexaLMIntent {
	name: string;
	slots?: AlexaLMInputObject[];
	samples?: string[];
}

export interface AlexaLMTypeValue {
	id: string | null;
	name: {
		value: string;
		synonyms?: string[]
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

export interface AlexaLMTypeObject {
	name: string;
	values: AlexaLMTypeValue[];
}

export interface AlexaModel {
	interactionModel: {
		languageModel: {
			invocationName: string;
			intents?: AlexaLMIntent[];
			types?: AlexaLMTypeObject[]
		}
	};
}


// export interface InputTypeAlexa extends InputType {
// 	// alexa?: AlexaModel;
// }

// export interface IntentAlexa extends Intent {
// 	alexa?: AlexaModel;
// }


export interface JovoTaskContextAlexa extends JovoTaskContext {
	askProfile: string;
	lambdaArn?: string;
	newSkill?: boolean;
}

export interface JovoModelAlexa extends JovoModel {
	alexa?: AlexaModel;
}

export interface IntentInputAlexa extends IntentInput {
	alexa?: {
		samples: string[];
	};
}

export interface AppFileAlexa extends AppFile {
	alexaSkill?: {
		nlu?: {
			name: string;
		}
	};
}
