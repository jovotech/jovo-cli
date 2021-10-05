import { JovoCliPlugin, PluginType } from '../../../../src';

export class Plugin extends JovoCliPlugin {
  id: string = 'commandPlugin';
  type: PluginType = 'command';
}
