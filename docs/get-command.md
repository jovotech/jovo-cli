---
title: 'get CLI Command'
excerpt: 'Learn more about the Jovo CLI get command.'
---

# get Command

Learn how you can synchronize your local project files with the developer consoles using the `jovov4 get` CLI command.


## Introduction

The Jovo CLI can be used to communicate with various developer consoles, for example from platforms like Alexa or Google Assistant.

`jovov4 get` allows you to download files from a developer console into your `build` folder to synchronize your local files with the remote console project. You can see it as the opposite of the [`deploy` command](./deploy-command.md).

A use case for `get` is convenience. Sometimes, it's easier to make updates (modify a language model, upload assets) in the browser based developer portal instead of JSON files. `get` allows you to make the changes online and the import them into your project.

You can then take a look at the updated `build` folder and copy those changes over to the [project configuration](./project-config.md), for example by using the [file builder](./project-config.md#file-builder). This will make sure that the content in the developer console does not get overridden in the next [`build` command](./build-command.md) execution.


## get:platform

Use `get:platform` to synchronize your local `build` files with platform developer consoles:

```sh
$ jovov4 get:platform <platform>

# Example
$ jovov4 get:platform alexa
```

You can also add flags from the table below.

| Flag | Description | Examples |
|---|---|---|
| `--locale`, `-l` | The locales to be retrieved | `--locale en`, `--locale en de`  |
| `--overwrite` | Overwrite existing files in the `build` folder | |
| `--stage` | The stage to be retrieved. See [staging](./project-config.md#staging). | `--stage dev` |
| `--build-reverse` | Turn retrieved models into Jovo models in the `models` folder. See [`build` command docs](./build-command.md#reverse-build) for more information. | |


CLI integrations may also add their own flags. Learn more in the respective platform docs:

- [Alexa get](https://v4.jovo.tech/marketplace/platform-alexa/cli-commands#get)
- [Google Assistant get](https://v4.jovo.tech/marketplace/platform-googleassistant/cli-commands#get)