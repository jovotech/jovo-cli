import { AppFile, Intent, JovoTaskContext } from 'jovo-cli-core';

export interface JovoTaskContextGoogle extends JovoTaskContext {
	pathToZip: string;
	keyFile: string;
}

export interface DialogFlowLMIntentData {
	text: string;
	userDefined: boolean;
	alias?: string;
	meta?: string;
}

export interface DialogFlowLMIntent {
	isTemplate: boolean;
	count: number;
	data: DialogFlowLMIntentData[];
}


export interface DialogFlowLMInputParameterObject {
	name: string;
	isList: boolean;
	value: string;
	dataType: string;
}


export interface DialogFlowResponse {
	parameters: DialogFlowLMInputParameterObject[];
}


export interface DialogFlowLMEntity {
	isOverridable?: boolean;
	isEnum?: boolean;
	automatedExpansion?: boolean;
}


export interface DialogFlowLMInputObject {
	name: string;
	auto: boolean;
	webhookUsed: boolean;
	responses?: DialogFlowResponse[];
}


export interface IntentDialogFlow extends Intent {
	dialogflow?: IntentDialogFlow;
}


export interface AppFileDialogFlow extends AppFile {
	googleAction?: {
		nlu?: {
			name: string;
		}
	};
}
