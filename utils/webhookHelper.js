'use strict';
const request = require('request');


/**
 * Looks for a running ngrok instance und returns
 * the public secured url
 * @param {Number} port
 * @param {func} callback
 */
module.exports.getNgrokUrl = function(port, callback) {
    const options = {
        url: 'http://localhost:4040/api/tunnels',
        headers: {
            accept: 'application/json',
        },
    };

    let webhookPort = port ? port : 3000;
    request(options, function(error, response, body) {
        if (error) {
            callback(error);
            return;
        }

        let result = JSON.parse(body);
        for (let i = 0; i < result.tunnels.length; i++) {
            let tunnel = result.tunnels[i];
            if (tunnel.proto === 'https' && tunnel.config.addr === 'localhost:'+webhookPort) {
                callback(null, result.tunnels[i].public_url);
            }
        }
    });
};
