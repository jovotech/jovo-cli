#!/usr/bin/env node
'use strict';
const program = require('commander');

program
    .command("lambda")
    .description("Proxies an HTTP service running at the specified port")
    .action( function () {
        console.log("Proxy Lambda");
    });

program
    .command("function")
    .description("Proxies an HTTP service running at the specified port")
    .action( function () {
        console.log("Proxy Function");
    });

program.parse(process.argv);