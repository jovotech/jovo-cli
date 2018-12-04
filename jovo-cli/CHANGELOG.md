# Jovo CLI Changelog


## 1.2.3 (September 18, 2018)
* Fixed invalid characters in Dialogflow entity synonyms issue #55

## 1.2.2 (September 17, 2018)
* Fixed supported languages in agent.json bug issue #54
* Fixed platform specific intent properties (Alexa)


## 1.2.1 (August 17, 2018)
* Fixed Dialogflow input type bug issue  [#237](https://github.com/jovotech/jovo-framework-nodejs/issues/237) 

## 1.2.0 (August 02, 2018)
* Added language model testing `jovo run --model-test`
* Added update notifier

## 1.1.14 (July 16, 2018)
* [#48](https://github.com/jovotech/jovo-cli/pull/48) Added validation for Amazon Alexa Invocation Name requirements [@KristaTheCoder](https://github.com/KristaTheCoder)

## 1.1.13 (July 13, 2018)
* Added Amazon built in slots extendability
* Fixed Google Action `build --reverse` for multiple locales
* Fixed another staging bug

## 1.1.12 (July 09, 2018)
* Fixed staging bug

## 1.1.11 (July 05, 2018)
* Removed debugging logs

## 1.1.10 (July 04, 2018)
* Switched to AWS-SDK Lambda upload

## 1.1.9 (June 29, 2018)
* Added 'Allow app.json to override interactonModel' issue #42
* Fixed 'Interfaces node gets clobbered from skill.json after jovo build with stages' issue #43
* Fixed 'Jovo webhook strips useful headers like `authorization`' issue #45

## 1.1.8 (June 27, 2018)
* Fixed empty skillId bug

## 1.1.7 (June 26, 2018)
* Added --disable-jovo-debugger argument to `jovo run`
* Fixed empty phrases in Dialogflow intents

## 1.1.6 (June 20, 2018)
* Fixed endpoint uri bug
* Added --timeout <timeout> to `jovo run`

## 1.1.5 (June 15, 2018)
* Fixed 'Unable to modify Default Fallback & Default Welcome intents' (issue #37)
* Fixed 'Dialogflow's headers are lost while importing to jovo' (issue #36)


## 1.1.4 (June 08, 2018)
* Fixed entity name in build --reverse (DialogFlow) (issue #31)

## 1.1.3 (May 29, 2018)
* Fixed src path bug (issue #28)
* Fixed empty uri bug (issue #25)
* Fixed error logging bug (issue #22)


## 1.1.2 (May 23, 2018)
* [#26](https://github.com/jovotech/jovo-cli/pull/26) Fixed pass projectId when running `build --deploy` [@fgnass](https://github.com/fgnass)
* [#27](https://github.com/jovotech/jovo-cli/pull/27) Added activate service account + project id in app.json [@aswetlow](https://github.com/aswetlow)

## 1.1.1 (May 18, 2018)
* Bugfix

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
