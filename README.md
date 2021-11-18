# Jovo CLI

> To view this page on the Jovo website, visit https://v3.jovo.tech/marketplace/jovo-cli

The Jovo Command Line Tools offer the ability to create, prototype, test, and deploy your voice app quickly. Learn more about all the commands here.

- [Introduction](#introduction)
  - [Installation](#installation)
  - [Troubleshooting](#troubleshooting)
  - [Command Types](#command-types)
- [Basic Commands](#basic-commands)
  - [jovo new](#jovo-new)
  - [jovo run](#jovo-run)
  - [jovo update](#jovo-update)
- [Platform Commands](#platform-commands)
  - [jovo build](#jovo-build)
  - [jovo get](#jovo-get)
  - [jovo deploy](#jovo-deploy)

## Introduction

> This is the CLI for Jovo `v3`, which you can now access using `jovo3`. Learn more here: https://www.jovo.tech/docs/migration-from-v3#use-v4-and-v3-in-parallel

The Jovo CLI (GitHub Repository: [jovotech/jovo-cli](https://github.com/jovotech/jovo-cli)) is the center of voice app development with the Jovo Framework. With it, you can quickly create new Jovo projects, create language models and deploy them to the voice platforms, and run your voice apps locally for easy prototyping and testing.

### Installation

To make best use of the Jovo CLI, install it globally via npm:

```sh
$ npm install -g jovo-cli
```

After successful installation, you should be able to see the menu by just typing the following into your command line:

```sh
$ jovo3
```

You can check the version number (and compare it to the [jovo-cli npm package](https://www.npmjs.com/package/jovo-cli) version) with this command:

```sh
$ jovo3 -V
```

### Troubleshooting

Find out more about technical requirements in our [Installation Guide](https://v3.jovo.tech/docs/installation).

If you had the CLI installed with an outdated major version and are running into problems after updating it to the latest one, please try to uninstall it globally before you install it again:

```sh
$ npm uninstall -g jovo-cli
```

If you run into other problems, please submit an issue here: [jovotech/jovo-cli](https://github.com/jovotech/jovo-cli). Thank you!

### Command Types

Jovo CLI commands can be divided into [basic commands](#basic-commands) (to create and run projects) and [platform commands](#platform-commands) (to interact with a voice platform).

|                                         | Command                        | Description                                                                               |
| --------------------------------------- | ------------------------------ | ----------------------------------------------------------------------------------------- |
| [Basic Commands](#basic-commands)       | [`jovo3 new`](#jovo-new)       | Creates a new Jovo project                                                                |
|                                         | [`jovo3 run`](#jovo-run)       | Runs a local development server (webhook)                                                 |
|                                         | [`jovo3 update`](#jovo-update) | Update all of the Jovo packages in your project                                           |
| [Platform Commands](#platform-commands) | [`jovo3 build`](#jovo-build)   | Builds platform-specific language model files into `/platforms` based on `/models` folder |
|                                         | [`jovo3 get`](#jovo-get)       | Downloads an existing platform project into the `/platforms` folder                       |
|                                         | [`jovo3 deploy`](#jovo-deploy) | Deploys the `/platforms` project files to the voice platforms                             |

## Basic Commands

These are the basic commands that help you develop Jovo voice apps faster, without interacting with the voice platforms (see [platform commands](#platform-commands) for features that are language model specific).

### jovo new

![jovo new command](./img/jovo-new.png 'jovo new command')

You can create a Jovo project into a new directory with the following command:

```sh
## Default
$ jovo3 new <directory>
```

> Learn more about this command here: [cli/new](https://v3.jovo.tech/marketplace/jovo-cli/new).

### jovo run

![jovo run command](./img/jovo-run.png 'jovo run command')

You can use the `jovo run` command to start the development server in your `index.js` file, and then add the [Jovo Webhook](https://v3.jovo.tech/docs/webhook) as an endpoint to the respective developer consoles.

Learn more here: [Docs: Configuration > Hosting](https://v3.jovo.tech/docs/hosting).

```sh
# Default
$ jovo3 run
```

> Learn more about this command here: [cli/run](https://v3.jovo.tech/marketplace/jovo-cli).

### jovo update

To update to the latest minor version (updating either `x` or `y` in `2.x.y`) of the framework, you can use the following command:

```sh
# Update all Jovo packages
$ jovo3 update
```

This is are necessary (as opposed to `$ npm install jovo-framework`) because the framework is now split into different modules.

> [Learn more about upgrading Jovo here](https://v3.jovo.tech/docs/installation/upgrading).

## Platform Commands

Platform commands are used to interact with the voice platforms (Amazon Alexa or Google Assistant/Dialogflow). You don't have to use these commands if you just want to maintain the language/interaction models on the respective developer platforms.

See the following tutorials for alternative ways to create language models on the respective developer platforms:

- [Alexa Skill Beginner Tutorial](https://v3.jovo.tech/tutorials/alexa-skill-tutorial-nodejs/)
- [Google Action Beginner Tutorial](https://v3.jovo.tech/tutorials/google-action-tutorial-nodejs/)

### jovo build

![jovo build command](./img/jovo-build.png 'jovo build command')

`jovo build` is the command to create and update the platform specific interaction models using the Jovo model. Using the files in the `/models` folder and converting them into files in the `/platforms` folder.

To learn more about Jovo Language Models, take a look at [App Configuration > Models](https://v3.jovo.tech/docs/model).

You can either run `build` separately for each platform, or just let the CLI fetch the right information from the `project.js` file.

```sh
# Default
$ jovo3 build
```

> Learn more about this command here: [cli/build](https://v3.jovo.tech/marketplace/jovo-cli/build).

### jovo get

![jovo get command](./img/jovo-get.png 'jovo get command')

`jovo get` will import an existing Alexa Skill (Skill Information and Interaction Model) or Dialogflow agent (work in progress) into the `/platforms` folder.

To get the Skill from the Amazon developer console, you have to set up [ASK CLI](https://developer.amazon.com/docs/smapi/quick-start-alexa-skills-kit-command-line-interface.html) first.

```sh
# Choose from list of Skills
$ jovo3 get <alexaSkill|googleAction>
```

> Learn more about this command here: [cli/get](https://v3.jovo.tech/marketplace/jovo-cli/get).

### jovo deploy

![jovo deploy command](./img/jovo-deploy.png 'jovo deploy command')

`jovo deploy` is used to upload the platform folders to their respective developer consoles.

```sh
# Default
$ jovo3 deploy
```

> Learn more about this command here: [cli/deploy](https://v3.jovo.tech/marketplace/jovo-cli/deploy).
