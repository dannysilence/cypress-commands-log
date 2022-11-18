# cypress-commands-log
Saving executed commands to external file


Based on https://github.com/bahmutov/cypress-failed-log

## Usage
In your support/e2e.js (support/e2e.ts) add the following line:
```javascript


import * as commandLogs from '@dannysilence/cypress-commands-log';
commandLogs.configure(Cypress, Cypress.config, {enabled: true, writeToConsole: true, writeToFile: true});

```

And in `cypress.config.js` update `setupNodeEvents` function:
```javasccript
const { defineConfig } = require('cypress')

module.exports = defineConfig({
  defaultCommandTimeout: 500,
  e2e: {
    setupNodeEvents(on, config) {
      require('@dannysilence/cypress-commands-log')
        .configure(on, config, {enabled: true, writeToConsole: true, writeToFile: true});
    },
  },
})




```

##  Output
In cypress folder the directory logs will be created and the files inside will look like the following:
```
{
  "specName": "cypress\\e2e\\sample3.cy.ts",
  "title": " should pass 1",
  "suiteName": " in positive flows",
  "testName": "Repoter Functionality  in positive flows  should pass 1",
  "testError": "",
  "testCommands": [
    {
      "message": "wait 2500",
      "duration": 1
    },
    {
      "message": "wrap 1",
      "duration": 3
    },
    {
      "message": "assert expected **1** to be above **0**",
      "duration": 2
    },
    {
      "message": "log hello, ",
      "duration": 1
    }
  ]
}
```