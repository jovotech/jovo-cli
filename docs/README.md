---
title: 'CLI'
excerpt: 'Learn more about the Jovo CLI.'
---

# Jovo CLI

Learn more about the Jovo CLI, the command line interface that lets you create new Jovo projects, run them locally, and deploy them to various platforms.

## Introduction

The Jovo CLI allows you to speed up the development process of voice and chat apps with the Jovo Framework. Both individual developers as well as teams use the CLI to develop and test Jovo apps more efficiently.

With the Jovo CLI, you can do many things, including:

- Create new Jovo projects with the [`new` command](https://www.jovo.tech/docs/new-command)
- Develop Jovo apps locally using the [`run` command](https://www.jovo.tech/docs/run-command)
- [`build`](https://www.jovo.tech/docs/build-command) and [`deploy`](https://www.jovo.tech/docs/deploy-command) projects to various platforms and services
- [Extend the CLI](#extend-the-jovo-cli) with your own custom hooks and plugins

Learn how to install the Jovo CLI in the [installation](#installation) section. In the [configuration](#configuration) section, we'll take a look at configurations and plugins that can be added to the CLI.

After that, we'll take a look at all [CLI commands](#commands) and ways to [extend the Jovo CLI](#extend-the-jovo-cli).

## Installation

You can install the new Jovo CLI like this:

```sh
$ npm install -g @jovotech/cli
```

After successful installation, you should be able to see the Jovo CLI menu by typing the following into your command line:

```sh
$ jovo
```

## Configuration

You can configure the Jovo CLI and its plugins in the `jovo.project.js` file in the root of a Jovo project:

```js
const { ProjectConfig } = require('@jovotech/cli');

// ...

const project = new ProjectConfig({
  endpoint: '${JOVO_WEBHOOK_URL}',
  plugins: [
    // Add Jovo CLI plugins here
  ],
});
```

[Learn more in the project configuration documentation](https://www.jovo.tech/docs/project-config).

## Commands

Learn more about the Jovo CLI commands:

- [`new`](https://www.jovo.tech/docs/new-command): Create a new Jovo project
- [`run`](https://www.jovo.tech/docs/run-command): Start the local development server
- [`build`](https://www.jovo.tech/docs/build-command): Create platform-specific project files
- [`deploy`](https://www.jovo.tech/docs/deplooy-command): Deploy to various platforms and services
- [`get`](https://www.jovo.tech/docs/get-command): Sync your local files with platform files
- [`update](https://www.jovo.tech/docs/update-command): Update Jovo packages in your project

## Integrations

Currently, these integrations are available for the Jovo CLI:

- [Amazon Alexa](https://www.jovo.tech/marketplace/platform-alexa/project-config): Build and deploy project files to the Alexa Developer Console
- [Google Assistant](https://www.jovo.tech/marketplace/platform-googleassistant/project-config): Build and deploy project files to the Actions on Google Console
- [Serverless](https://www.jovo.tech/marketplace/target-lex): Deploy your Jovo code using the Serverless Framework

## Extend the Jovo CLI

There are many use cases where it could make sense to customize the Jovo CLI to fit your workflow. For example, it could be necessary to call an API to get some external data that is relevant for the language model in the `build` process. Or you might want to build your own deployment integration.

There are two ways how you can extend the Jovo CLI:

- [CLI hooks](https://www.jovo.tech/docs/project-config#hooks): Hook into existing CLI commands. For example, call an API and retrieve data as part of the `build` command.
- [CLI plugins](https://www.jovo.tech/docs/cli-plugins): Create your own plugins that could hook into commands, or even create commands on their own.
