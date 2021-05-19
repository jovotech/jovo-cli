import { PluginConfig } from '@jovotech/cli-core';

export interface ServerlessConfig extends PluginConfig {
  service: string;
  frameworkVersion?: string;
  provider: AwsProvider | AzureProvider;
  package?: {
    patterns?: string[];
    excludeDevDependencies?: boolean;
    artifact?: string;
    individually?: boolean;
  };
  resources?: {};
  functions?: {
    [key: string]: {
      handler: string;
    };
  };
}

export interface AwsProvider {
  name: 'aws';
  runtime?: string;
  stage?: string;
  timeout?: string;
  region?: string;
  iam?: {
    role:
      | string
      | {
          name: string;
          managedPolicies: string[];
          permissionsBoundary: string;
          statements: {
            Effect: string;
            Action: string[];
            Resource: { [resource: string]: string[] };
          }[];
        };
  };
}

export interface AzureProvider {
  name: 'azure';
  subscriptionId?: string;
  runtime?: string;
  region?: string;
  stage?: string;
  armTemplate?: {
    file?: string;
    parameters?: {
      [key: string]: {
        type: 'string' | 'int' | 'bool' | 'object' | 'array';
        defaultValue?: string;
      };
    };
  };
}
