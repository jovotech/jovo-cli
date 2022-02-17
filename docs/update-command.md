---
title: 'update CLI Command'
excerpt: 'Learn more about the Jovo CLI update command.'
---

# update Command

Learn how to use the `jovo update` command.

## Introduction

You can use the `jovo update` command to list and update all out-of-date Jovo packages of the current project to their latest version, if necessary.

```sh
$ jovo update
```

You can also add flags from the table below.

| Flag          | Description                                                             | Examples |
| ------------- | ----------------------------------------------------------------------- | -------- |
| `--yes`, `-y` | Skip the prompt to update packages and run the update non-interactively |          |

## Troubleshooting

### Command Not Found

All [global CLI commands](https://www.jovo.tech/docs/cli#commands) are referenced in the [user config](https://www.jovo.tech/docs/cli#user-config) file in `.jovo/config`. If you run into `command not found` errors, it's possible that the CLI can't access the user config.

If you need to access local versions of this command, for example in an npm script or CI environment, you can add it to the [`jovo.project.js` configuration](./project-config.md) like this:

```js
const { ProjectConfig } = require('@jovotech/cli');
const { UpdateCommand } = require('@jovotech/cli-command-update');
// ...

const project = new ProjectConfig({
  endpoint: '${JOVO_WEBHOOK_URL}',
  plugins: [
    new UpdateCommand(),
    // ...
  ],
});
```
