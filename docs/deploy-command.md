---
title: 'deploy CLI Command'
excerpt: 'Learn more about the Jovo CLI deploy command.'
---

# deploy Command

The `jovo deploy` CLI command can be used to deploy your project to various developer consoles and cloud providers.

## Introduction

The `jovo deploy` command offers the following features:

- [`deploy:platform`](#deploy-platform): Upload project files to platform developer consoles (e.g. Amazon Alexa Developer Console, Actions on Google Console)
- [`deploy:code`](#deploy-code): Upload the source code to a cloud provider (e.g. AWS Lambda)

For these commands to work, you need to add plugins (for example for the platform you want to deploy to) to your [project configuration](./project-config.md). Here is an example how this looks like for the [serverless integration](https://www.jovo.tech/marketplace/target-serverless):

```js
const { ProjectConfig } = require('@jovotech/cli');
const { ServerlessCli } = require('@jovotech/target-serverless');

// ...

const project = new ProjectConfig({
  // ...

  plugins: [
    // ...

    new ServerlessCli({
      /* options */
    }),
  ],
});
```

## deploy:platform

Many platforms offer their own developer consoles where you need to deploy your project to. For example, an Alexa Skill project needs to be created in the Alexa Developer Console with content including publishing information and an interaction model. The Jovo CLI makes that process easier.

Before running the command, make sure that you've used the [`build` command](./build-command.md) to prepare all the files. The contents of the `build` will be used by the `deploy:platform` command.

```sh
$ jovo deploy:platform <platform>

# Example
$ jovo deploy:platform alexa
```

You can also add flags from the table below.

| Flag             | Description                                                                   | Examples                        |
| ---------------- | ----------------------------------------------------------------------------- | ------------------------------- |
| `--locale`, `-l` | The locales to be deployed                                                    | `--locale en`, `--locale en de` |
| `--stage`        | The project stage to be deployed. See [staging](./project-config.md#staging). | `--stage dev`                   |

Platform integrations may also add their own flags. Learn more in the respective platform docs:

- [Alexa deployment](https://www.jovo.tech/marketplace/platform-alexa/cli-commands#deploy)
- [Google Assistant deployment](https://www.jovo.tech/marketplace/platform-googleassistant/cli-commands#deploy)

## deploy:code

The `deploy:code` command is used to bundle and deploy your project's code (typically the contents of the `src` folder) to a cloud provider.

```sh
$ jovo deploy:code <target>

# Example
$ jovo deploy:code serverless
```

Jovo uses [`esbuild`](https://github.com/evanw/esbuild) for fast bundling and small file sizes. Depending on the stage, the `deploy:code` command executes the `bundle:<stage>` script in your `package.json` (you can find a [sample file here](https://github.com/jovotech/jovo-v4-template/blob/master/package.json)). The [`new:stage` command](./new-command.md#new-stage) automatically creates the appropriate scripts for new stages.

You can also add flags from the table below.

| Flag          | Description                                                                      | Examples       |
| ------------- | -------------------------------------------------------------------------------- | -------------- |
| `--src`, `-s` | Path to source files                                                             | `--src ./src`  |
| `--stage`     | The app stage to be deployed. See [staging](https://www.jovo.tech/docs/staging). | `--stage prod` |

Deployment target integrations may also add their own flags and commands. Learn more in the respective docs:

- [Serverless deployment](https://www.jovo.tech/marketplace/target-serverless)

## Troubleshooting

### Command Not Found

All [global CLI commands](https://www.jovo.tech/docs/cli#commands) are referenced in the [user config](https://www.jovo.tech/docs/cli#user-config) file in `.jovo/config`. If you run into `command not found` errors, it's possible that the CLI can't access the user config.

If you need to access local versions of this command, for example in an npm script or CI environment, you can add it to the [`jovo.project.js` configuration](./project-config.md) like this:

```js
const { ProjectConfig } = require('@jovotech/cli');
const { DeployCommand } = require('@jovotech/cli-command-deploy');
// ...

const project = new ProjectConfig({
  endpoint: '${JOVO_WEBHOOK_URL}',
  plugins: [
    new DeployCommand(),
    // ...
  ],
});
```
