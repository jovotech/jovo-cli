export const PLATFORMS: {
  [key: string]: { frameworkPlugin: string; cliPlugin: string; path: string };
} = {
  alexa: {
    frameworkPlugin: 'Alexa',
    cliPlugin: 'AlexaCli',
    path: 'jovo-platform-alexa',
  },
  google: {
    frameworkPlugin: 'GoogleAssistant',
    cliPlugin: 'GoogleCli',
    path: 'jovo-platform-googleassistantconv',
  },
};
