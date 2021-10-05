---
title: 'CLI Plugins'
excerpt: 'Learn how to build your own Jovo CLI plugin.'
---

# Custom Jovo CLI Plugins

Learn how to build your own Jovo CLI plugin.

## Introduction

The Jovo CLI allows you to create custom CLI plugins that can hook into existing commands, and even create their own. For example, the [Serverless CLI plugin](https://v4.jovo.tech/marketplace/target-serverless) allows you to deploy your code to various cloud providers by hooking into the [`deploy` command](./deploy-command.md) and even creating its own `build:serverless` command.

The following plugin types are available:

- `platform`: Builds and deploys platform specific files. Often part of a [framework platform integration](https://v4.jovo.tech/docs/platforms).
- `target`: A deployment plugin like the [Serverless CLI plugin](https://v4.jovo.tech/marketplace/target-serverless)
- `command`: A custom command


## Structure of a CLI Plugin

```typescript
import { JovoCliPlugin, PluginCommand, PluginType } from '@jovotech/cli-core';

export class YourPlugin extends JovoCliPlugin {
  $id: string = '<id>';
  $type: PluginType = 'command'; // target, platform

  getCommands(): typeof PluginCommand[] {
    return [];
  }
}

export default YourPlugin;
```

## Configuration

After successful creation, you can add the plugin to your [project configuration](./project-config.md) like this:

```js
const { ProjectConfig } = require('@jovotech/cli-core');
const YourPlugin = require('./plugins/YourPlugin');

// ...

const project = new ProjectConfig({
  endpoint: '${JOVO_WEBHOOK_URL}',
  plugins: [
    new YourPlugin(),
  ],
});
```

You can also add options like this:

```js
new YourPlugin({
  // ...
}),
```