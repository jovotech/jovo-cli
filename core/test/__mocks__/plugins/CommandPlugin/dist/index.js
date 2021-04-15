const { JovoCliPlugin } = require('../../../../../dist');

class CommandPlugin extends JovoCliPlugin {
  type = 'command';
  id = 'commandPlugin';
}

module.exports = { CommandPlugin, default: CommandPlugin };
