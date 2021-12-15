---
title: 'CLI Plugins'
excerpt: 'Learn how to build your own Jovo CLI plugin.'
---

# Custom Jovo CLI Plugins

Learn how to build your own Jovo CLI plugin.

## Introduction

The Jovo CLI allows you to create custom CLI plugins that can hook into existing commands, and even create their own. For example, the [Serverless CLI plugin](https://www.jovo.tech/marketplace/target-serverless) allows you to deploy your code to various cloud providers by hooking into the [`deploy` command](./deploy-command.md) and even creating its own `build:serverless` command.

In the next few sections, we're first going to take a look at the [structure or a CLI plugin](#structure-of-a-cli-plugin), including examples for [command hooks](#command-hooks) and [custom commands](#custom-commands).

After that, we'll dive into the [configuration](#configuration) of a CLI plugin.

## Structure of a CLI Plugin

Each Jovo CLI plugin contains at least the following elements:

```typescript
import { JovoCliPlugin, PluginType } from '@jovotech/cli-core';

export class YourPlugin extends JovoCliPlugin {
  id: string = '<id>';
  type: PluginType = 'command'; // target, platform

  // ...
}
```

These properties must be set for the plugin to work:

- `id`: Used by the CLI to reference the plugin. For example, in `jovo build:platform alexa`, the ID is `alexa`.
- `type`: The following plugin types are available:
  - `platform`: Builds and deploys platform specific files. Often part of a [framework platform integration](https://www.jovo.tech/docs/platforms).
  - `target`: A deployment plugin like the [Serverless CLI plugin](https://www.jovo.tech/marketplace/target-serverless).
  - `command`: A custom command.

### Command Hooks

```typescript
import { JovoCliPlugin, PluginType, PluginHook } from '@jovotech/cli-core';
import { SomeHook } from './SomeHook';

export class YourPlugin extends JovoCliPlugin {
  // ...

  getHooks(): typeof PluginHook[] {
    return [SomeHook];
  }
}
```

A CLI hook file looks like this:

```typescript
import { PluginHook } from '@jovotech/cli-core';

export class SomeHook extends PluginHook {
  install(): void {
    this.middlewareCollection = {
      '<middleware>': [this.someMethod.bind(this)],
    };
  }

  someMethod(): void {
    // ...
  }
}
```

### Custom Commands

```typescript
import { JovoCliPlugin, PluginCommand, PluginType } from '@jovotech/cli-core';
import { SomeCommand } from './SomeCommand';

export class YourPlugin extends JovoCliPlugin {
  // ...

  getCommands(): typeof PluginCommand[] {
    return [SomeCommand];
  }
}
```

A CLI command file looks like this:

```typescript
import { PluginCommand } from '@jovotech/cli-core';

export class SomeCommand extends PluginCommand {
  static id = 'build:serverless';
  static description = 'Build serverless configuration file.';
  static examples: string[] = ['jovo build:serverless'];
  static flags = {
    clean: flags.boolean({
      description:
        'Deletes all platform folders and executes a clean build. If --platform is specified, it deletes only the respective platforms folder.',
    }),
    deploy: flags.boolean({
      char: 'd',
      description: 'Runs deploy after build.',
      exclusive: ['reverse'],
    }),
    ...PluginCommand.flags,
  };

  async run(): Promise<void> {}
}
```

### Command Decorators

You can use the `@ProjectCommand` decorator to check if the command is eligible to be run in the current working directory.

```typescript
import { ProjectCommand } from '@jovotech/cli-core';
// ...

@ProjectCommand()
export class SomeCommand extends PluginCommand {
  // ...
}
```

If the command is used outside a Jovo project, the CLI will display an error, letting the user know to go to a valid Jovo project directory.

## Configuration

After successful creation, you can add the plugin to your [project configuration](./project-config.md) like this:

```js
const { ProjectConfig } = require('@jovotech/cli');
const YourPlugin = require('./plugins/YourPlugin');

// ...

const project = new ProjectConfig({
  endpoint: '${JOVO_WEBHOOK_URL}',
  plugins: [new YourPlugin()],
});
```

It is also possible to add configurations like this, for example:

```js
new YourPlugin({
  someConfig: true,
}),
```

This is how a plugin that accepts config looks like:

```typescript
import { JovoCliPlugin, PluginType, PluginConfig } from '@jovotech/cli-core';

export interface YourPluginConfig extends PluginConfig {
  someConfig: boolean;
  // ...
}

export class YourPlugin extends JovoCliPlugin {
  // ...

  constructor(config: YourPluginConfig) {
    super(config);
  }

  getDefaultConfig(): YourPluginConfig {
    return {
      someConfig: false,
    };
  }
}
```

It includes the following elements:

- An type interface (in the example `YourPluginConfig`) where all config options are defined.
- A `constructor()` that passes the `config` to the `JovoCliPlugin` class.
- [A `getDefaultConfig()` method](#getdefaultconfig) that returns the default configuration options in case the config is not defined in the project configuration.
- [A `getInitConfig()` method](#getinitconfig) that returns the configuration options that should always be added to the `jovo.project.js` file.

You can then access the config object using `this.$config`.

### getDefaultConfig

The `getDefaultConfig()` method returns the default configuration of your plugin:

```typescript
import { JovoCliPlugin, PluginConfig } from '@jovotech/cli-core';

export interface YourPluginConfig extends PluginConfig {
  someConfig: boolean;
  // ...
}

export class YourPlugin extends JovoCliPlugin {
  // ...

  getDefaultConfig(): YourPluginConfig {
    return {
      someConfig: false,
    };
  }
}
```

### getInitConfig

The `getInitConfig()` returns the configuration options that should be added to the [project configuration](./project-config.md) for the plugin to work. The Jovo CLI automatically adds this config to the `jovo.project.js` after installing the plugin using the [`new` command](./new-command.md).

```typescript
import { JovoCliPlugin, PluginConfig } from '@jovotech/cli-core';

export interface YourPluginConfig extends PluginConfig {
  apiKey: string;
  // ...
}

export class YourPlugin extends JovoCliPlugin {
  // ...

  getInitConfig(): YourPluginConfig {
    return {
      apiKey: '<YOUR-API-KEY>',
    };
  }
}
```

For example, the above looks like this:

```js
new YourPlugin({
  apiKey: '<YOUR-API-KEY>',
}),
```

You can also make use of the `RequiredOnlyWhere` type to specify which keys of your type are required, while all other elements are optional.
This allows you to differentiate between keys that are required to be set by the user, and keys that are required, but can be set in `getDefaultConfig()`.

```typescript
import { JovoCliPlugin, PluginConfig, RequiredOnlyWhere } from '@jovotech/cli-core';
// ...

export interface YourPluginConfig extends PluginConfig {
  apiKey: string;
  someKey: string;
  // ...
}

export type YourPluginInitConfig = RequiredOnlyWhere<YourPluginConfig, 'apiKey'>;

getInitConfig(): YourPluginInitConfig {
  return {
    apiKey: '<YOUR-API-KEY>',
  };
}
```

You can also reference multiple keys like this:

```typescript
export type YourPluginInitConfig = RequiredOnlyWhere<YourPluginConfig, 'apiKey' | 'someKey'>;
```
