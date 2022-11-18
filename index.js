var configure = (on, config, settings = {enabled: false, writeToConsole: false, writeToFile: false}) => {
    if(typeof Cypress === 'undefined' && typeof on === 'function') {
      on('task', {
        writeTestCommand({type, data}) {
          switch(type) {
            case 'testStart':
              console.log('  ┌ '+data + ' start ');
              break;
            case 'testStep':
              console.log('  ├ '+data );
              break;
            case 'testEnd':
              console.log('  └ '+data + ' end ');
              break;
          }
          return 0;
        }
      })
    } else 
    if(typeof Cypress !== 'undefined') {
      const path = require('path')
      const debug = require('debug')('cypress-commands-log')

      // check built-in module against missing methods
      if (typeof path.basename !== 'function') {
        throw new Error('path.basename should be a function')
      }

      const getFilepath = filename => path.join('cypress', 'logs', filename)
      const testCaseTable = {}
      const specData = { spec: '', tests: [] }

      let savingCommands = false, testStarted = false
      let loggedCommands = []

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

        if (settings.writeToFile === true) {
          const str = JSON.stringify(specData, null, 2) + '\n'
          const filename = specName.includes("\\") ? specName.replace("\\", "/") + `.json` : specName + '.json';
          const filepath = getFilepath(filename)

          cy.writeFile(filepath, str, { log: false })
        }
      }

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
          if (!savingCommands) return;

          if(testStarted === false) {
            testStarted = true
            if(settings.enabled === true && settings.writeToConsole === true) {
              const test = this.currentTest.title;
              cy.task('writeTestCommand', {type: 'testStart', data: test}, {log:false})
            }
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

            ///currentTest.consoleOutputs = (currentTest.consoleOutputs || []).concat(log);

            if(settings.enabled === true && settings.writeToConsole === true) {
              cy.task('writeTestCommand', {type: 'testStep', data: log}, {log:false})
            }
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

        const info = {
          specName: specName.replace(/cypress[\/|\\]e2e[\/|\\]/g, '').replace(/\.cy\.[j|t]s/g, ''),
          title,
          suiteName,
          testName,
          testError,
          testCommands
        }

        this.currentTest.commandsLogs = testCommands;

        writeTestInfo(info)
        testStarted = false
        if(settings.enabled === true && settings.writeToConsole === true) {
          const test = this.currentTest.title;
          cy.task('writeTestCommand', {type: 'testEnd', data: test}, {log:false})
        }
        // info.filepath = filepath
      }

      if (settings.enabled === true) {
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
      }
    }
    
    return config;
}

module.exports.configure = configure();
