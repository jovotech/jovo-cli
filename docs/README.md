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

After that, we'll take a look at all [CLI commands](#commands) and ways to [extend the Jovo CLI](#extend-the-jovo-cli). For bugfixes, take a look at the [local setup](#local-setup) section.

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

There are two types of Jovo CLI configurations:

- [Project config](#project-config): Project specific configurations, mostly used for [`build`](https://www.jovo.tech/docs/build-command) and [`deploy`](https://www.jovo.tech/docs/deploy-command) commands.
- [User config](#user-config): Global configurations, includes the [webhook](https://www.jovo.tech/docs/webhook) ID and all globally installed [CLI commands](#commands).

## Project Config

For each project, you can configure the Jovo CLI and its plugins in the [`jovo.project.js` project configuration file](https://www.jovo.tech/docs/project-config) in the root of a Jovo project:

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

[Learn more about project configuration here](https://www.jovo.tech/docs/project-config).

## User Config

There is also a global `config` file for the Jovo CLI that gets saved into a `.jovo` folder in your root user directory. This is called [`UserConfig`](https://github.com/jovotech/jovo-cli/blob/v4/latest/core/src/UserConfig.ts).

It includes the following configurations:

```typescript
{
  webhook!: {
    uuid: string;
  };
  cli!: {
    plugins: string[];
    presets: Preset[];
    omitHints?: boolean;
  };
  timeLastUpdateMessage?: string;
}
```

- `webhook`: Configuration for your [Jovo Webhook](https://www.jovo.tech/docs/webhook) URL.
- `cli`: This includes global plugins (all installed CLI commands), presets (that are used and added during the [`new` command](https://www.jovo.tech/docs/new-command)), and a flag `omitHints` that can be modified to suppress the display of hints when using Jovo CLI commands.
- `timeLastUpdateMessage`: This is an internal value that tracks when was the last time the CLI checked for potential updates.

Here is an example `config` file:

```json
{
  "webhook": {
    "uuid": "<your-webhook-id>"
  },
  "cli": {
    "plugins": [
      "@jovotech/cli-command-build",
      "@jovotech/cli-command-deploy",
      "@jovotech/cli-command-get",
      "@jovotech/cli-command-new",
      "@jovotech/cli-command-run",
      "@jovotech/cli-command-update"
    ],
    "presets": [
      {
        "name": "default",
        "projectName": "helloworld",
        "locales": ["en"],
        "platforms": [],
        "language": "typescript"
      }
    ]
  },
  "timeLastUpdateMessage": "2022-02-16T16:27:39.960Z"
}
```

As you can see in the `plugins` section in the example above, all [global CLI commands](#commands) are referenced in the user config. If you run into `command not found` errors, it's possible that the CLI can't access the user config.

If you need to access local versions of the commands, for example in an npm script or CI environment, you can add them to the [project configuration](#project-config) like this:

```js
const { ProjectConfig } = require('@jovotech/cli');
const { BuildCommand } = require('@jovotech/cli-command-build');
// ...

const project = new ProjectConfig({
  endpoint: '${JOVO_WEBHOOK_URL}',
  plugins: [
    new BuildCommand(),
    // ...
  ],
});
```

## Commands

Learn more about all global Jovo CLI commands:

- [`new`](https://www.jovo.tech/docs/new-command): Create a new Jovo project
- [`run`](https://www.jovo.tech/docs/run-command): Start the local development server
- [`build`](https://www.jovo.tech/docs/build-command): Create platform-specific project files
- [`deploy`](https://www.jovo.tech/docs/deploy-command): Deploy to various platforms and services
- [`get`](https://www.jovo.tech/docs/get-command): Sync your local files with platform files
- [`update`](https://www.jovo.tech/docs/update-command): Update Jovo packages in your project

You can also add your own commands. Learn more in the [extend the Jovo CLI](#extend-the-jovo-cli) section.

## Integrations

Currently, these integrations are available for the Jovo CLI:

- [Amazon Alexa](https://www.jovo.tech/marketplace/platform-alexa/project-config): Build and deploy project files to the Alexa Developer Console
- [Google Assistant](https://www.jovo.tech/marketplace/platform-googleassistant/project-config): Build and deploy project files to the Actions on Google Console
- [Serverless](https://www.jovo.tech/marketplace/target-lex): Deploy your Jovo code using the Serverless Framework

## Extend the Jovo CLI

There are many use cases where it could make sense to customize the Jovo CLI to fit your workflow. For example, it could be necessary to call an API to get some external data that is relevant for the language model in the [`build` process](https://www.jovo.tech/docs/build-command). Or you might want to build your own deployment integration.

There are two ways how you can extend the Jovo CLI:

- [CLI hooks](https://www.jovo.tech/docs/project-config#hooks): Hook into existing CLI commands. For example, call an API and retrieve data as part of the `build` command.
- [CLI plugins](https://www.jovo.tech/docs/cli-plugins): Create your own plugins that could hook into commands, or even create commands on their own.

### Local Setup

If you want to extend the Jovo CLI functionality, it should be sufficient to follow the steps mentioned above. However, if you encounter any issues or want to dig deeper into core functionality, it might be useful to set up the CLI for local development.

To get started, clone the CLI repository to your workspace and run the local setup script:

```sh
# Clone CLI repository
$ git clone https://github.com/jovotech/jovo-cli.git

# Go to the CLI directory
$ cd jovo-cli

# Run the local setup script
$ npm run setup:dev
```

This will install all necessary dependencies and link the local binary to `jovodev`. This allows you to apply and test changes in the code directly by recompiling the corresponding module and running `jovodev`.

```sh
$ jovodev
```

For example, if you need to make some changes to the `build:platform` command, you need to go into `jovo-cli/commands/command-build`, adjust the code to your needs and recompile it using `npm run build`, or `npm run build:watch` if you want to recompile on code changes automatically (similar to `nodemon`). When running the command using `jovodev`, you should see your changes implemented:

```sh
$ jovodev build:platform
```
