const { JovoCliPlugin } = require('../../../../../dist');

class CommandPlugin extends JovoCliPlugin {
  constructor(config) {
    super(config);
    this.type = 'command';
    this.id = 'commandPlugin';
  }
}

module.exports = { CommandPlugin, default: CommandPlugin };
