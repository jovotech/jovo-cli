import { PluginConfig } from '@jovotech/cli-core';
import { LexModelIntentResource } from 'jovo-model-lex';
import { SupportedLocales } from './Constants';

export type SupportedLocalesType = typeof SupportedLocales[number];

export interface LexCliConfig extends PluginConfig {
  locales?: {
    [locale: string]: SupportedLocalesType[];
  };
  name?: string;
  version?: string;
  childDirected: boolean;
  abortStatement: {
    messages: {
      content: string;
      contentType: 'PlainText' | 'SSML' | 'CustomPayload';
      groupNumber?: number;
    }[];
  };
  clarificationPrompt: {
    maxAttempts: number;
    messages: {
      content: string;
      contentType: 'PlainText' | 'SSML' | 'CustomPayload';
      groupNumber?: number;
    }[];
  };
  region: string;
  credentials: {
    accessKeyId: string;
    secretAccessKey: string;
  };
  voiceId?:
    | 'Salli'
    | 'Joanna'
    | 'Matthew'
    | 'Ivy'
    | 'Justin'
    | 'Kendra'
    | 'Kimberly'
    | 'Joey'
    | '0';
  description?: string;
  idleSessionTTLInSeconds?: number;
  detectSentiment?: boolean;
}

export interface LexIntent extends LexModelIntentResource {
  checksum?: string;
}
