import { IScaffoldParameters } from '.';

export function scaffold(params: IScaffoldParameters) {
  switch (params.type) {
    case 'js':
      return getJs(params);
    case 'ts':
      return getTs(params);
    default:
      return '';
  }
}

function getJs({ handler }: IScaffoldParameters) {
  return `'use strict';
const { App } = require('jovo-framework');
const { Alexa } = require('jovo-platform-alexa');
const { GoogleAssistant } = require('jovo-platform-googleassistant');
const { JovoDebugger } = require('jovo-plugin-debugger');
const { FileDb } = require('jovo-db-filedb');
const app = new App();
	
app.use(
	new Alexa(),
	new GoogleAssistant(),
	new JovoDebugger(),
	new FileDb()
);
	
app.setHandler(${handler});
	
module.exports = { app };`;
}

function getTs({ handler }: IScaffoldParameters) {
  return `import { App } from 'jovo-framework';
import { Alexa } from 'jovo-platform-alexa';
import { GoogleAssistant } from 'jovo-platform-googleassistant';
import { JovoDebugger } from 'jovo-plugin-debugger';
import { FileDb } from 'jovo-db-filedb';
	
const app = new App();
	
app.use(
	new Alexa(),
	new GoogleAssistant(),
	new JovoDebugger(),
	new FileDb(),
);
	
app.setHandler(${handler});
	
module.exports = { app };`;
}
