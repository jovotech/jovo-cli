const { JovoCliPlugin } = require('../../../../../dist');

class CommandPlugin extends JovoCliPlugin {
  constructor(config) {
    super(config);
    this.$id = 'commandPlugin';
    this.$type = 'command';
  }
}

module.exports = { CommandPlugin, default: CommandPlugin };
