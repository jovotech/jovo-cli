const { JovoCliPlugin } = require('../../../../../dist');

class Plugin extends JovoCliPlugin {
  constructor(config) {
    super(config);
    this.id = 'commandPlugin';
    this.type = 'command';
  }
}

module.exports = { Plugin, default: Plugin };
