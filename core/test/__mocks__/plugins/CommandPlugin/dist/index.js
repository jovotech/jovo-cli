const { JovoCliPlugin } = require('../../../../../dist/src');

class CommandPlugin extends JovoCliPlugin {
  id = 'commandPlugin';
  type = 'command';
}

module.exports = { CommandPlugin, default: CommandPlugin };
