---
title: 'run Command - Jovo CLI'
excerpt: 'Learn more about the Jovo CLI run command.'
---

# run Command

Learn how to use the `jovov4 run` command for local development of Jovo apps.

## Introduction

You can use the `jovov4 run` command to start the local development server and test your app using the [Jovo Debugger](https://v4.jovo.tech/docs/debugger).

```sh
$ jovov4 run
```

You can also add flags from the table below.

| Flag | Description | Examples |
|---|---|---|
| `--port`, `-p` | The port to be used for the server | `--port 3000` (default) |
| `--timeout` | Timeout for the server process | `--inspect 5000` (default) |
| `--inspect`, `-i` | The port to be used for debugging | `--inspect 3000` |
| `--webhook-only` | Starts the Jovo Webhook proxy without executing the code | |