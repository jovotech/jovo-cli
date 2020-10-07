import { JovoTaskContext } from 'jovo-cli-core';

export interface GALocalizedProjectSettings {
  displayName: string;
  pronunciation: string;
  developerEmail?: string;
  developerName?: string;
  shortDescription?: string;
  fullDescription?: string;
  privacyPolicyUrl?: string;
  termsOfServiceUrl?: string;
  sampleInvocations?: string[];
  smallLogoImage?: string;
  largeBannerImage?: string;
}

export interface GAProjectSettings {
  projectId?: string;
  defaultLocale?: string;
  localizedSettings?: GALocalizedProjectSettings;
  [key: string]: string | GALocalizedProjectSettings | object | undefined;
}

export interface JovoTaskContextGoogleCA extends JovoTaskContext {
  projectId: string;
}

export interface GAProjectLanguages {
  [key: string]: string | string[];
}

export interface GActionsError {
  code: number;
  message: string;
  details: { fieldViolations: { description: string }[] }[];
}

export interface GAWebhooks {
  [key: string]: {
    handlers: { name: string }[];
    inlineCloudFunction?: {
      executeFunction: string;
    };
    httpsEndpoint?: {
      baseUrl: string;
    };
  };
}
