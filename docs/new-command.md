---
title: 'new CLI Command'
excerpt: 'Learn more about the Jovo CLI new command.'
---

# new Command

Learn how to create new Jovo projects and other files using the `jovov4 new` command of the Jovo CLI.

## Introduction

`jovov4 new` can be used for the following features:

- [`new`](#new-project): Create a new Jovo project
- [`new:stage`](#new:stage): Create a new stage


## New Project

You can create a Jovo project into a new directory with the following command:

```sh
$ jovov4 new <directory>
```

This will open a wizard that helps you create a new Jovo project by defining platforms to develop for, languages, and more.

You can also add flags from the table below.

| Flag | Description | Examples |
|---|---|---|
| `--locale`, `-l` | The locales to be created | `--locale en`, `--locale en, de`  |
| `--overwrite` | Overwrite existing files in the specified `<directory>` | |
| `--no-wizard` | Creates a project from the default template without using the wizard | |
| `--language` | Specifies the code language of your project | `--language typescript` |



## new:stage

The `new:stage` command helps you create a new stage. [Learn more about staging here](https://v4.jovo.tech/docs/staging).

```sh
$ jovov4 new:stage <stage>
```

The command will create a new file `app.<stage>.ts` and also offer to create a new server file.