"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const io = require("socket.io-client");
const HttpPost_1 = require("./HttpPost");
let socketInstance;
function open(id, webhookBaseUrl, options) {
    console.log('\n\nwebhook: socket: open: 1');
    console.log(webhookBaseUrl);
    console.log(id);
    options = options || {};
    socketInstance = io.connect(webhookBaseUrl, {
        secure: true,
        query: {
            id,
        },
    });
    socketInstance.on('disconnect', () => {
        console.log('GOT DISCONNECTED!!!');
    });
    socketInstance.on('connect', () => {
        console.log(`This is your webhook url: ${webhookBaseUrl}/${id}`);
    });
    socketInstance.on('connect_error', (error) => {
        console.error('Sorry, there seems to be an issue with the connection!');
        console.error(error);
    });
    console.log('webhook: socket: open: 2');
    socketInstance.on(`request-${id}`, (data) => {
        HttpPost_1.post(data.request, data.headers, data.params, options.post)
            .then((result) => {
            socketInstance.emit(`response-${id}`, result);
        })
            .catch((error) => {
            console.error('Local server did not return a valid JSON response:');
            console.error(error.rawData);
            socketInstance.emit(`response-${id}`, null);
        });
    });
    return socketInstance;
}
exports.open = open;
function close() {
    return socketInstance.close();
}
exports.close = close;
//# sourceMappingURL=SocketRedirect.js.map