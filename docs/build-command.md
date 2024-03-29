---
title: 'build CLI Command'
excerpt: 'Learn more about the Jovo CLI build command.'
---

# build Command

Learn how you can use the `jovo build` command to create platform specific project files that are ready for deployment.

## Introduction

The Jovo CLI can be used to deploy projects to various developer consoles like the Alexa and Actions on Google consoles. The `build` command helps with creating platform specific files that can be deployed to the respective platform developer consoles using the [`deploy` command](./deploy-command.md).

`jovo build` turns the files from the [`models` folder](https://www.jovo.tech/docs/models) and the [project configuration from `jovo.project.js`](./project-config.md) into platform specific files in the `build` folder. These files can then be used for deployment.

```sh
$ jovo build:platform <platform>
```

Running the `build` command from above will execute the command for a platform plugin that needs to added to the [project configuration](./project-config.md) before. Learn more about the command flags in the [`build:platform` section](#build-platform).

It is also possible to reverse the process and create `models` from the contents of the `build` folder. Learn more in the [reverse build section](#reverse-build).

## build:platform

The `build:platform` file is used to build files for a single platform. The files are created into the `build` folder, specifically a `platform.<platform>` subfolder:

```sh
$ jovo build:platform <platform>

# Example
$ jovo build:platform alexa
```

If you added stages to your [project configuration](./project-config.md), the platform folder will be inside the respective stage folder: `build/<stage>/platform.<platform>`.

You can also add flags from the table below.

| Flag              | Description                                                                                                                                          | Examples                        |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| `--locale`, `-l`  | The locales to be built from the `models` folder                                                                                                     | `--locale en`, `--locale en de` |
| `--stage`         | The stage to be built. See [staging](./project-config.md#staging).                                                                                   | `--stage dev`                   |
| `--clean`         | Delete the relevant folders in `build` at the beginning of the process                                                                               |                                 |
| `--reverse`, `-r` | Turn contents of the `build` folder into `models`. See [reverse build section](#reverse-build) below.                                                |                                 |
| `--deploy`, `-d`  | Directly deploy the platform after the build process. See the [`deploy:platform` command](./deploy-command.md#deploy-platform) for more information. |                                 |

CLI integrations may also add their own flags. Learn more in the respective docs:

- [Alexa `build`](https://www.jovo.tech/marketplace/platform-alexa/cli-commands#build)
- [Google Assistant `build`](https://www.jovo.tech/marketplace/platform-googleassistant/cli-commands#build)

## Reverse Build

In this reverse process, you can create a [Jovo Model](https://www.jovo.tech/docs/models) from an existing `build` folder, for example after you fetched the files with [`jovo get`](https://www.jovo.tech/docs/get-command).

```sh
$ jovo build:platform <platform> --reverse

# Example
$ jovo build:platform alexa --reverse
```

This will prompt you if you want to overwrite the existing files or rather create a backup first. You can also skip this step and delete the files before the this by using the `--clean` option:

```sh
$ jovo build:platform <platform> --reverse --clean
```

## Troubleshooting

### Command Not Found

All [global CLI commands](https://www.jovo.tech/docs/cli#commands) are referenced in the [user config](https://www.jovo.tech/docs/cli#user-config) file in `.jovo/config`. If you run into `command not found` errors, it's possible that the CLI can't access the user config.

If you need to access local versions of this command, for example in an npm script or CI environment, you can add it to the [`jovo.project.js` configuration](./project-config.md) like this:

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
