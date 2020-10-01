import { JovoTaskContext } from 'jovo-cli-core';

export interface GASettings {
  localizedSettings: {
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
  };
  projectId?: string;
  defaultLocale?: string;
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
