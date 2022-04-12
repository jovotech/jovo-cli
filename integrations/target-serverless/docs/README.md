---
title: 'Serverless CLI Integration'
excerpt: 'This Jovo CLI plugin bundles and deploys your Jovo app code using the Serverless CLI.'
---

# Serverless CLI Integration

This Jovo CLI plugin bundles and deploys your Jovo app code using the [Serverless CLI](https://www.serverless.com/). This makes it possible to upload your `src` code to various cloud providers by using the [`deploy:code` command](https://www.jovo.tech/docs/deploy-command#deploy:code).


## Installation

Install the plugin like this:

```sh
$ npm install @jovotech/target-serverless
```

If you haven't installed the official Serverless CLI globally yet, you can do so with this command:

```sh
$ npm install -g serverless
```

Add the plugin to your `jovo.project.js` [project configuration](https://www.jovo.tech/docs/project-config) file like this:

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

The `build:serverless` command can then be used to generate a sample `serverless.yml` file for deployment:

```sh
# Create serverless.yaml file based on plugin configuration
$ jovo build:serverless
```

This file can be modified directly or in the [configuration](#configuration). You can learn more about its structure in the [official `serverless.yml` reference](https://www.serverless.com/framework/docs/providers/aws/guide/serverless.yml).

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
      frameworkVersion: '2',
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

When running the `build:serverless` command, this configuration gets converted into YAML format to generate the `serverless.yaml` file that is needed for [deployment](#deployment). Learn more about all possible properties in the [official `serverless.yml` reference](https://www.serverless.com/framework/docs/providers/aws/guide/serverless.yml).

```sh
# Create serverless.yaml file based on plugin configuration
$ jovo build:serverless
```

This is the file that gets generated based on the default configuration:

```yaml
service: my-jovo-serverless-app
frameworkVersion: "2"
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

Before you proceed make sure that the generated entry for the property `"frameworkVersion"` in the file `serverless.yaml` matches the version number of your local serverless installation. Not sure? Find out with the command `serverless --version`. 

There are also additional configurations that may be needed for the [deployment](#deployment) process. Learn more about Serverless configuration in their [official documentation](https://www.serverless.com/framework/docs/).

For example, to get started with AWS; you need to make the following keys accessible:

```sh
export AWS_ACCESS_KEY_ID=<your-key-here>
export AWS_SECRET_ACCESS_KEY=<your-secret-key-here>
```


## Deployment

After generating a `serverless.yaml` file using the `build:serverless` command, you can use the [`deploy:code` command](https://www.jovo.tech/docs/deploy-command#deploy:code) to bundle and deploy your code:

```sh
# Deploy the code using 'serverless deploy'
$ jovo deploy:code serverless
```

The command does the following:
- Bundles the files in `src` using the `npm run bundle:<stage>` script and stores it in a `bundle` directory. The default stage is `dev`, [learn more about staging here](https://www.jovo.tech/docs/staging)).
- Calls the `serverless deploy` command, which uses the `serverless.yaml` configuration file to upload the `bundle` to a cloud provider.
