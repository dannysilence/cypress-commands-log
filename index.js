 /// <reference types="cypress" />
// @ts-check
'use strict'

const path = require('path')
const debug = require('debug')('cypress-failed-log')

// check built-in module against missing methods
if (typeof path.basename !== 'function') {
  throw new Error('path.basename should be a function')
}

const maxFileNameLength = 220
const cleanupFilename = s => Cypress._.kebabCase(Cypress._.deburr(s))
const truncateFilename = s => Cypress._.truncate(s, {
  length: maxFileNameLength,
  omission: ''
})
const getCleanFilename = s => truncateFilename(cleanupFilename(s))
const getFilepath = filename => path.join('cypress', 'logs', filename)
const retriesTimes = getRetriesTimes()

function getRetriesTimes () {
  const retries = Cypress.config('retries')
  if (Cypress._.isNumber(retries)) {
    return retries
  }

  if (Cypress._.isObject(retries) && Cypress._.isNumber(retries.runMode)) {
    return retries.runMode
  }

  return 0
}

const testCaseTable = {}

function writeTestInfo ({
  specName,
  title,
  suiteName,
  testName,
  testError,
  testCommands
}) {
  const info = {
    specName,
    title,
    suiteName,
    testName,
    testError,
    testCommands
  }
  const str = JSON.stringify(info, null, 2) + '\n'
  const cleaned = getCleanFilename(
    Cypress._.join([
      Cypress._.split(specName, '.')[0],
      testName
    ], '-'))
  const filename = `${cleaned}.json`
  const filepath = getFilepath(filename)
  cy
    .writeFile(filepath, str, {log:false})
    //.log(`saved failed test information to ${filename}`)

  return filepath
}

let savingCommands = false
let loggedCommands = []

function startLogging () {
  debug('will log Cypress commands')

  Cypress.on('test:before:run', () => {
    debug('before test run')
   
    loggedCommands = []
    savingCommands = true
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

//function initLog () {
//  loggedCommands = []
//}

function onFinish () {
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

  const testError = (this.currentTest.state === 'passed') ? '' : this.currentTest.err.message

  const commands = loggedCommands

  const testCommands = commands;

  const specName = Cypress.spec.relative

  console.log('=== test failed ===')
  console.log(specName)
  console.log('=== title ===')
  console.log(title)
  if (suiteName) {
    console.log('suite', suiteName)
  }
  console.log(testName)
  console.log('=== error ===')
  console.log(testError)
  console.log('=== commands ===')
  console.log(testCommands.join('\n'))

  const info = {
    specName,
    title,
    suiteName,
    testName,
    testError,
    testCommands
  }

  this.currentTest.commandsLogs = testCommands;
  
  const filepath = writeTestInfo(info)
  console.log('saving the log file %s', filepath)
  info.filepath = filepath

}

const _afterEach = afterEach
//const _beforeEach = beforeEach

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
//beforeEach(initLog)
_afterEach(onFinish)
