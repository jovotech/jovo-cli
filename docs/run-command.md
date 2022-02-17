---
title: 'run CLI Command'
excerpt: 'Learn more about the Jovo CLI run command.'
---

# run Command

Learn how to use the `jovo run` command for local development of Jovo apps.

## Introduction

You can use the `jovo run` command to start the local development server and test your app using the [Jovo Debugger](https://www.jovo.tech/docs/debugger).

```sh
$ jovo run
```

You can also add flags from the table below.

| Flag           | Description                                                                                                                                                | Examples                   |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| `--port`, `-p` | The port to be used for the server                                                                                                                         | `--port 3000` (default)    |
| `--timeout`    | Maximum amount of time in milliseconds before the server returns a timeout                                                                                 | `--timeout 5000` (default) |
| `--stage`      | The app stage (e.g. `app.dev.ts`) to be run. Only possible for stages that use the Jovo Express server. See [staging](https://www.jovo.tech/docs/staging). | `--stage dev` (default)    |

## Troubleshooting

### Command Not Found

All [global CLI commands](https://www.jovo.tech/docs/cli#commands) are referenced in the [user config](https://www.jovo.tech/docs/cli#user-config) file in `.jovo/config`. If you run into `command not found` errors, it's possible that the CLI can't access the user config.

If you need to access local versions of this command, for example in an npm script or CI environment (which we don't recommend for the `run` command), you can add it to the [`jovo.project.js` configuration](./project-config.md) like this:

```js
const { ProjectConfig } = require('@jovotech/cli');
const { RunCommand } = require('@jovotech/cli-command-run');
// ...

const project = new ProjectConfig({
  endpoint: '${JOVO_WEBHOOK_URL}',
  plugins: [
    new RunCommand(),
    // ...
  ],
});
```
