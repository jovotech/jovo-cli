---
title: 'Serverless CLI Integration'
excerpt: 'This Jovo CLI plugin bundles and deploys your Jovo app code using the Serverless CLI.'
---

# Serverless CLI Integration

This Jovo CLI plugin bundles and deploys your Jovo app code using the [Serverless CLI](https://www.serverless.com/).

## Introduction

[Serverless](https://www.serverless.com/) is a framework and CLI that makes it easier to deploy your code to various cloud providers.

With this integration for the [Jovo CLI](https://www.jovo.tech/docs/cli), you can us Serverless to upload your `src` code to providers like [AWS](https://www.jovo.tech/marketplace/server-lambda) with the [`deploy:code` command](https://www.jovo.tech/docs/deploy-command#deploy:code).

[You can find an example on GitHub](https://github.com/jovotech/jovo-sample-alexa-googleassistant-lambda).

Learn more in the following sections:
- [Installation](#installation)
- [Configuration](#configuration)
- [Deployment](#deployment)
- [Examples](#examples)
- [Troubleshooting](#troubleshooting)

## Installation

Install the plugin like this:

```sh
$ npm install @jovotech/target-serverless
```

If you haven't installed the official Serverless CLI globally yet, you can do so with the below command. By default, this integration assumes the Serverless CLI version `3`. Learn more in the [configuration](#configuration) section.

```sh
$ npm install -g serverless
```

Add the plugin to your `jovo.project.js` [project configuration](#configuration) file like this:

```js
const { ProjectConfig } = require('@jovotech/cli');
const { ServerlessCli } = require('@jovotech/target-serverless');
// ...

const project = new ProjectConfig({
  // ...

  plugins: [
    // ...
    new ServerlessCli()
  ],
});
```

The `build:serverless` command can then be used to generate a `serverless.yaml` file for deployment:

```sh
# Create serverless.yaml file based on plugin configuration
$ jovo build:serverless
```

This file can be modified directly or in the [`jovo.project.js` configuration](#configuration). You can learn more about its structure in the [official `serverless.yml` reference](https://www.serverless.com/framework/docs/providers/aws/guide/serverless.yml).

The [`deploy:code` command](https://www.jovo.tech/docs/deploy-command#deploy:code) can then be used to bundle the code in the `src` folder and then deploy it based on the `serverless.yml` using the Serverless CLI.

```sh
# Deploy the code using 'serverless deploy'
$ jovo deploy:code serverless
```

Depending on the provider you want to deploy to, you may also need to make additional configurations. For example, to get started with AWS, you need to make the following keys accessible:

```sh
export AWS_ACCESS_KEY_ID=<your-key-here>
export AWS_SECRET_ACCESS_KEY=<your-secret-key-here>
```

Learn more about all steps in the [configuration](#configuration) and [deployment](#deployment) sections.


## Configuration

In your `jovo.project.js` [project configuration](https://www.jovo.tech/docs/project-config), you can configure the Serverless CLI plugin. This is the default configuration:

```js
const { ProjectConfig } = require('@jovotech/cli');
const { ServerlessCli } = require('@jovotech/target-serverless');
// ...

const project = new ProjectConfig({
  // ...

  plugins: [
    // ...
    new ServerlessCli({
      service: 'my-jovo-serverless-app',
      frameworkVersion: '3', // Needs to match your Serverless CLI version
      package: {
        artifact: './bundle.zip',
      },
      provider: {
        name: 'aws',
        runtime: 'nodejs12.x',
      },
      functions: {
        handler: {
          handler: 'index.handler',
        },
      },
    })
  ],
});
```

Make sure that the property `"frameworkVersion"` matches the version number of your local Serverless installation. Not sure? Find out with the command `serverless --version`.

When running the `build:serverless` command, this configuration gets converted into YAML format to generate the `serverless.yaml` file that is needed for [deployment](#deployment). Learn more about all possible properties in the [official `serverless.yml` reference](https://www.serverless.com/framework/docs/providers/aws/guide/serverless.yml).

```sh
# Create serverless.yaml file based on plugin configuration
$ jovo build:serverless
```

This is the file that gets generated based on the default configuration:

```yaml
service: my-jovo-serverless-app
frameworkVersion: "3"
package:
  artifact: ./bundle.zip
provider:
  name: aws
  runtime: nodejs12.x
functions:
  handler:
    handler: index.handler
```

You can either generate the `serverless.yaml` once and modify it directly, or update the plugin configuration and generate a new file using the `build:serverless` command.

There are also additional configurations that may be needed for the [deployment](#deployment) process. Learn more about Serverless configuration in their [official documentation](https://www.serverless.com/framework/docs/).

For example, to get started with AWS; you need to make the following keys accessible:

```sh
export AWS_ACCESS_KEY_ID=<your-key-here>
export AWS_SECRET_ACCESS_KEY=<your-secret-key-here>
```


## Deployment

After generating a `serverless.yaml` file using the `build:serverless` command, you can use the [`deploy:code` command](https://www.jovo.tech/docs/deploy-command#deploy:code) to bundle and deploy your code.

```sh
# Deploy the code using 'serverless deploy'
$ jovo deploy:code serverless

# Example: Deploy prod stage
$ jovo deploy:code serverless --stage prod
```

The command does the following:
- Bundles the files in `src` using the `npm run bundle:<stage>` script and stores it in a `bundle` directory. The default stage is `dev`, [learn more about staging here](https://www.jovo.tech/docs/staging)).
- Calls the `serverless deploy` command, which uses the `serverless.yaml` configuration file to upload the `bundle` to a cloud provider.


## Examples

### AWS

To deploy your Jovo app to [AWS Lambda](https://www.jovo.tech/marketplace/server-lambda), you can use [this example on GitHub](https://github.com/jovotech/jovo-sample-alexa-googleassistant-lambda).

To enable a [URL endpoint](https://www.serverless.com/blog/aws-lambda-function-urls-with-serverless-framework) for your function, you can add the following property. This is supported by Serverless `v3.12.0` and up.

```js
new ServerlessCli({
  // ...
  functions: {
    handler: {
      // ...
      url: true,
    }
  }
}),
```

You can retrieve the function URL and other information using the `serverless info` command.

For platforms like [Alexa](https://www.jovo.tech/marketplace/platform-alexa/project-config) that allow longer response times, you can also increase the timeout, for example:

```js
new ServerlessCli({
  // ...
  functions: {
    handler: {
      // ...
      timeout: 7, // 7 seconds
    }
  }
}),
```

For [DynamoDB](https://www.jovo.tech/marketplace/db-dynamodb), the following permissions need to be added to the [configuration](#configuration):

```js
new ServerlessCli({
  // ...
  provider: {
    // ...
    iam: {
      role: {
        statements: [
          {
            Effect: 'Allow',
            Action: [
              // @see https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_Operations.html
              'dynamodb:CreateTable',
              'dynamodb:DescribeTable',
              'dynamodb:Query',
              'dynamodb:Scan',
              'dynamodb:GetItem',
              'dynamodb:PutItem',
              'dynamodb:UpdateItem',
              'dynamodb:DeleteItem',
            ],
            Resource: 'arn:aws:dynamodb:*:*:table/*',
          },
        ],
      },
    },
  },
}),
```

## Troubleshooting

If you run into problems with the CLI integration (for example if it doesn't provide a verbose error message from Serverless), you can also use these two commands separately:

```sh
# Bundle code using bundle:<stage> script
# Example: prod stage
$ npm run bundle:prod

# Deploy code using Serverless CLI
$ serverless deploy
```