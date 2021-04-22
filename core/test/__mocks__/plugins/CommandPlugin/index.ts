import { JovoCliPlugin, PluginType } from '../../../../src';

export class CommandPlugin extends JovoCliPlugin {
  $id: string = 'commandPlugin';
  $type: PluginType = 'command';
}
