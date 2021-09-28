---
title: 'deploy CLI Command'
excerpt: 'Learn more about the Jovo CLI deploy command.'
---

# deploy Command

The `jovov4 deploy` CLI command can be used to deploy your project to various developer consoles and cloud providers.

## Introduction

The `jovov4 deploy` command offers the following features:

- [`deploy:platform`](#deploy:platform): Upload project files to platform developer consoles (e.g. Amazon Alexa Developer Console, Actions on Google Console)
- [`deploy:code`](#deploy:platform): Upload the source code to a cloud provider (e.g. AWS Lambda)

For these commands to work, you need to add plugins (for example for the platform you want to deploy to) to your [project configuration](./project-config.md). Here is an example how this looks like for the [serverless integration](https://v4.jovo.tech/marketplace/target-serverless):

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


## deploy:platform

Many platforms offer their own developer consoles where you need to deploy your project to. For example, an Alexa Skill project needs to be created in the Alexa Developer Console with content including publishing information and an interaction model. The Jovo CLI makes that process easier. 

Before running the command, make sure that you've used the [`build` command](./build-command.md) to prepare all the files. The contents of the `build` will be used by the `deploy:platform` command.

```sh
$ jovov4 deploy:platform <platform>

# Example
$ jovov4 deploy:platform alexa
```

You can also add flags from the table below.

| Flag | Description | Examples |
|---|---|---|
| `--locale`, `-l` | The locales to be deployed | `--locale en`, `--locale en, de` |
| `--stage` | The stage to be deployed. See [staging](./project-config.md#staging). | `--stage dev`  |

Platform integrations may also add their own flags. Learn more in the respective platform docs:

- [Alexa deployment](https://v4.jovo.tech/marketplace/platform-alexa/project-config#deploy-command)
- [Google Assistant deployment](https://v4.jovo.tech/marketplace/platform-googleassistant/project-config#deploy-command)


## deploy:code

The `deploy:code` command is used to bundle and deploy your project's code (typically the contents of the `src` folder) to a cloud provider.

```sh
$ jovov4 deploy:code <target>
```

You can also add flags from the table below.

| Flag | Description | Examples |
|---|---|---|
| `--src`, `-s` | Path to source files | `--src ./src` |

Deployment target integrations may also add their own flags and commands. Learn more in the respective docs:

- [Serverless deployment](https://v4.jovo.tech/marketplace/target-serverless)