---
title: 'build Command - CLI'
excerpt: 'Learn more about the Jovo CLI build command.'
---

# build Command

Learn how you can use the `jovov4 build` command to create platform specific project files that are ready for deployment.

## Introduction

The Jovo CLI can be used to deploy projects to various developer consoles like the Alexa and Actions on Google consoles. The [`deploy` command](./deploy-command.md), however, needs platform specific files like language models and publishing information.

The `jovov4 build` command helps with this. It turns the files from the [`models` folder](https://v4.jovo.tech/docs/models) and the [project configuration from `jovo.project.js`](./project-config.md) into platform specific files in the `build` folder. These files can then be used for deployment.

```sh
$ jovov4 build
```

Running the `build` command from above will execute the command for all platform plugins that are added to the [project configuration](./project-config.md). Learn more about the command flags in the [`build:platform` section](#build:platform).

It is also possible to reverse the process and create `models` from the contents of the `build` folder. Learn more in the [reverse build section](#reverse-build).


## build:platform

The `build:platform` file is used to build files for a single platform. The files are created into the `build` folder, specifically a `platform.<platform>` subfolder:

```sh
# Build all platforms
$ jovov4 build

# Build single platform
$ jovov4 build:platform <platform>

# Example
$ jovov4 build:platform alexa
```

You can also add flags from the table below.

| Flag | Description | Examples |
|---|---|---|
| `--locale`, `-l` | The locales to be built from the `models` folder | `--locale en`, `--locale en de`  |
| `--stage` | The stage to be built. See [staging](./project-config.md#staging). | `--stage dev`  |
| `--clean` | Delete the relevant folders in `build` at the beginning of the process | |
| `--reverse`, `-r` | Turn contents of the `build` folder into `models`. See [reverse build section](#reverse-build) below. | |
| `--deploy`, `-d` | Directly deploy the platform after the build process. See the [`deploy:platform` command](./deploy-command.md) for more information. | |


CLI integrations may also add their own flags. Learn more in the respective docs:

- [Alexa build](https://v4.jovo.tech/marketplace/platform-alexa/cli-commands#build)
- [Google Assistant build](https://v4.jovo.tech/marketplace/platform-googleassistant/cli-commands#build)


## Reverse Build

In this reverse process, you can create a [Jovo Model](https://v4.jovo.tech/docs/models) from an existing `build` folder, for example after you fetched the files with [`jovov4 get`](https://v4.jovo.tech/docs/get-command).

```sh
$ jovov4 build:platform <platform> --reverse

# Example
$ jovov4 build:platform alexa --reverse
```

This will prompt you if you want to overwrite the existing files or rather create a backup first. You can also skip this step and delete the files before the this by using the `--clean` option:

```sh
$ jovov4 build:platform <platform> --reverse --clean
```