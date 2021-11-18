---
title: 'new CLI Command'
excerpt: 'Learn more about the Jovo CLI new command.'
---

# new Command

Learn how to create new Jovo projects and other files using the `jovo new` command of the Jovo CLI.

## Introduction

`jovo new` can be used for the following features:

- [`new`](#new-project): Create a new Jovo project
- [`new:stage`](#new:stage): Create a new app stage

## New Project

You can create a Jovo project into a new directory with the following command:

```sh
$ jovo new <directory>
```

This will open a wizard that helps you create a new Jovo project by defining platforms to develop for, languages, and more.

You can also add flags from the table below.

| Flag             | Description                                                                      | Examples                                         |
| ---------------- | -------------------------------------------------------------------------------- | ------------------------------------------------ |
| `--locale`, `-l` | The locales to be created                                                        | `--locale en`, `--locale en de`                  |
| `--language`     | Specifies the code language of your project                                      | `--language typescript`                          |
| `--preset`       | Skips the wizard and creates a project from a pre-configured preset              | `--preset default` (Typescript default template) |
| `--clean`        | Delete existing files in the specified `<directory>` before creating the project |                                                  |

## new:stage

The `new:stage` command helps you create a new app stage, for example `app.prod.ts`. [Learn more about staging here](https://www.jovo.tech/docs/staging).

```sh
$ jovo new:stage <stage>
```

The command will do the following:

- Create a new file `app.<stage>.ts`
- Prompt to specify which server will be used, and create a server file, for example `server.express.ts` or `server.lambda.ts`
- Add npm scripts `bundle:<stage>` (used by the [`deploy:code` command](./deploy-command.md#deploy:code)) and `start:<stage>` (used by the [`run` command](./run-command.md)) to the project's `package.json` file
