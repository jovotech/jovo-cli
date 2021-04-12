import { JovoCliPlugin, PluginType } from '../../../../src';

export class CommandPlugin extends JovoCliPlugin {
  type: PluginType = 'command';
  id: string = 'commandPlugin';
}
