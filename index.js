/// <reference types="cypress" />
// @ts-check
'use strict'

const fs = require('fs')
const path = require('path')
const debug = require('debug')('cypress-commands-log')

// check built-in module against missing methods
if (typeof path.basename !== 'function') {
  throw new Error('path.basename should be a function')
}

const getFilepath = filename => path.join('cypress', 'logs', filename)
// const retriesTimes = getRetriesTimes()

// function getRetriesTimes() {
//   const retries = Cypress.config('retries')
//   if (Cypress._.isNumber(retries)) {
//     return retries
//   }

//   if (Cypress._.isObject(retries) && Cypress._.isNumber(retries.runMode)) {
//     return retries.runMode
//   }

//   return 0
// }

const testCaseTable = {}
const specData = { spec: '', tests: [] }

function writeTestInfo({
  specName,
  title,
  suiteName,
  testName,
  testError,
  testCommands
}) {
  const info = {
    // specName,
    // title: title,
    // suite: suiteName,
    test: testName,
    commands: Cypress._.map(testCommands, c => c.message)
  }
  if (testError) {
    info.error = testError;
  }

  specData.spec = specName;
  // @ts-ignore
  specData.tests.push(info);

  const str = JSON.stringify(specData, null, 2) + '\n'
  const filename = specName.includes("\\") ? specName.replace("\\", "/") + `.json` : specName + '.json';
  const filepath = getFilepath(filename)

  cy.writeFile(filepath, str, { log: false })

  return filepath
}

let savingCommands = false
let loggedCommands = []

function startLogging() {
  debug('will log Cypress commands')

  Cypress.on('test:before:run', (attr, test) => {
    debug('before test run')

    loggedCommands = []
    savingCommands = true
  })

  Cypress.on('test:after:run', (attr, test) => {
    debug('after test run')

    savingCommands = false
  })

  Cypress.on('log:added', options => {
    if (!savingCommands) {
      return
    }
    if (options.instrument === 'command' && options.consoleProps) {
      let detailMessage = ''
      if (options.name === 'xhr') {
        detailMessage = (options.consoleProps.Stubbed === 'Yes' ? 'STUBBED ' : '') + options.consoleProps.Method + ' ' + options.consoleProps.URL
      }
      const log = {
        message: options.name + ' ' + options.message + (detailMessage !== '' ? ' ' + detailMessage : ''),
        duration: Date.now() - (+new Date(options.wallClockStartedAt))
      }
      debug(log)
      loggedCommands.push(log)
    }
  })

  Cypress.on('log:changed', options => {
    if (options.instrument === 'command' && options.consoleProps) {
      options.wallClockStoppedAt = Date.now()
      options.duration = +options.wallClockStoppedAt - (+new Date(options.wallClockStartedAt))
      options.consoleProps.Duration = options.duration
    }
  })
}

function onFinish() {
  savingCommands = false

  const testName = this.currentTest.fullTitle()

  // remember the test case retry times
  if (testCaseTable[testName]) {
    testCaseTable[testName] += 1
  } else {
    testCaseTable[testName] = 1
  }

  const title = this.currentTest.title
  const suiteName = this.currentTest.parent && this.currentTest.parent.title
  const testError = (this.currentTest.state === 'passed' || this.currentTest.state === 'pending') ? '' : this.currentTest.err.message
  const testCommands = loggedCommands
  const specName = Cypress.spec.relative

  // console.log('=== test failed ===')
  // console.log(specName)
  // console.log('=== title ===')
  // console.log(title)
  // if (suiteName) {
  //   console.log('suite', suiteName)
  // }
  // console.log(testName)
  // console.log('=== error ===')
  // console.log(testError)
  // console.log('=== commands ===')
  // console.log(testCommands.join('\n'))

  let base1 = "cypress\\e2e\\";
  let base2 = "cypress/e2e/";

  const info = {
    specName: specName.includes(base1) || specName.includes(base2) ? (specName.includes(base1) ? specName.replace(base1, "") : specName.replace(base2, "")) : specName,
    title,
    suiteName,
    testName,
    testError,
    testCommands
  }

  this.currentTest.commandsLogs = testCommands;

  /*const filepath =*/ writeTestInfo(info)
  // console.log('saving the log file %s', filepath)
  // info.filepath = filepath
}

const _afterEach = afterEach

afterEach = (name, fn) => {
  if (typeof name === 'function') {
    fn = name
    name = fn.name
  }

  _afterEach(name, function () {
    onFinish.call(this)
    fn.call(this)
  })
}

startLogging()
_afterEach(onFinish)
