export interface IScaffoldParameters {
    handler: string
}

export default function scaffold({ handler }: IScaffoldParameters) {
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

module.exports = { app };`

}