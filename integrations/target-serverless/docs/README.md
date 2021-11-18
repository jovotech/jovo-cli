---
title: 'Serverless CLI Integration'
excerpt: 'This Jovo CLI plugin bundles and deploys your Jovo app code using the Serverless CLI.'
---

# Serverless CLI Integration

This Jovo CLI plugin bundles and deploys your Jovo app code using the [Serverless CLI](https://www.serverless.com/).


## Installation

Install the plugin like this:

```sh
$ npm install @jovotech/target-serverless
```

If you haven't installed the official Serverless CLI globally yet, you can do so with this command:

```sh
$ npm install -g @serverless
```


## Configuration

Add the plugin to your `jovo.project.js` [project configuration](https://www.jovo.tech/docs/project-config) file like this:

```js
const { ProjectConfig } = require('@jovotech/cli-core');
const { ServerlessCli } = require('@jovotech/target-serverless');

// ...

const project = new ProjectConfig({
  
  // ...

  plugins: [
    // ...

    new ServerlessCli({ /* options */ })
  ],
});
```

Learn more about Serverless configuration in their [official documentation](https://www.serverless.com/framework/docs/).

For example, to get started with AWS; you need to make the following keys accessible:

```sh
export AWS_ACCESS_KEY_ID=<your-key-here>
export AWS_SECRET_ACCESS_KEY=<your-secret-key-here>
```


## Usage

The Serverless CLI integration works with two commands.

Use the `build:serverless` command to generate a `serverless.yaml` file into the root of your Jovo project. This only needs to be done once until you make changes to the config in the `jovo.project.js` file:

```sh
$ jovo build:serverless
```

After that, you can use the [`deploy:code` command](https://www.jovo.tech/docs/deploy-command#deploy:code) to bundle and deploy your code:

```sh
$ jovo deploy:code serverless
```