# Jovo CLI Changelog

## 1.1.0 (May 17, 2018)
* Fixed several bugs
* Combined x.x.x changes to 1.1


## 1.0.17 (May 04, 2018)
* Added staging functionality
* Added `jovo run --webhook-only`. Runs the Jovo Webhook without executing the code. (issue #15)
* Fixed blanks-in-path bug
* [#16](https://github.com/jovotech/jovo-cli/pull/16) Fixed --watch nodemon bug [@fgnass](https://github.com/fgnass)


## 1.0.16 (April 26, 2018)
* Add node debug feature to ``` jovo run [--inspect] ``` 

## 1.0.15 (April 24, 2018)
* Downgrade buggy adm-zip dependecy

## 1.0.14 (April 18, 2018)
* Added more unit tests
* Fixed minor bugs

## 1.0.12 + 1.0.13 (April 05, 2018)
* Fixed line separator bug

## 1.0.11 (April 05, 2018)
* [#12](https://github.com/jovotech/jovo-cli/pull/12): Added --src parameter to lambda deployment - [@aswetlow](https://github.com/aswetlow)
* [#12](https://github.com/jovotech/jovo-cli/pull/12): Added chainable get command (jovo get --build --reverse) - [@aswetlow](https://github.com/aswetlow).
* [#12](https://github.com/jovotech/jovo-cli/pull/12): Fixed empty intents in Jovo model bug - [@aswetlow](https://github.com/aswetlow).

## 1.0.10 (March 28, 2018)
* [bcc5ba3](https://github.com/jovotech/jovo-cli/commit/bcc5ba37b514e2a35d65342b645e22178153aa5f):  Fixed Alexa DialogMode build/reverse build - [@aswetlow](https://github.com/aswetlow).


## 1.0.9 (March 21, 2018)
* Fixed --watch ignore db bug on UNIX devices

## 1.0.7 (March 10, 2018)
* Fixed line separator bug for MacOS
* Updated help text for ASK CLI
