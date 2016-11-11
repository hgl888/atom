(function () {
  let loadSettings
  const Module = require('module')
  const path = require('path')
  const vm = require('vm')

  if (typeof snapshotResult !== 'undefined') {
    window.onload = function () {
      process.resourcesPath = path.normalize(process.resourcesPath)
      process.on('unhandledRejection', function (error, promise) {
        console.error('Unhandled promise rejection %o with error: %o', promise, error)
      })

      parseLoadSettings()
      setupAtomHome()

      require('../src/crash-reporter-start')({_version: loadSettings.appVersion})

      const initialize = snapshotResult.customRequire('./../src/initialize-application-window.js')
      snapshotResult.setGlobals(global, process, window, require)
      initialize()
    }
  }

  function setupCsonCache (cacheDir) {
    require('season').setCacheDir(path.join(cacheDir, 'cson'))
  }

  function setupVmCompatibility () {
    var vm = require('vm')
    if (!vm.Script.createContext) {
      vm.Script.createContext = vm.createContext
    }
  }

  function setupDeprecatedPackages () {
    var metadata = require('../package.json')
    if (!metadata._deprecatedPackages) {
      try {
        metadata._deprecatedPackages = require('../script/deprecated-packages.json')
      } catch (requireError) {
        console.error('Failed to setup deprecated packages list', requireError.stack)
      }
    }
  }

  function profileStartup (loadSettings, initialTime) {
    function profile () {
      console.profile('startup')
      var startTime = Date.now()
      setupWindow(loadSettings).then(function () {
        setLoadTime(Date.now() - startTime + initialTime)
        console.profileEnd('startup')
        console.log('Switch to the Profiles tab to view the created startup profile')
      })
    }

    var currentWindow = require('electron').remote.getCurrentWindow()
    if (currentWindow.devToolsWebContents) {
      profile()
    } else {
      currentWindow.openDevTools()
      currentWindow.once('devtools-opened', function () {
        setTimeout(profile, 1000)
      })
    }
  }

  function parseLoadSettings () {
    var rawLoadSettings = decodeURIComponent(window.location.hash.substr(1))
    try {
      loadSettings = JSON.parse(rawLoadSettings)
    } catch (error) {
      console.error('Failed to parse load settings: ' + rawLoadSettings)
      loadSettingsError = error
    }
  }

  var setupAtomHome = function () {
    if (process.env.ATOM_HOME) {
      return
    }

    // Ensure ATOM_HOME is always set before anything else is required
    // This is because of a difference in Linux not inherited between browser and render processes
    // https://github.com/atom/atom/issues/5412
    if (loadSettings && loadSettings.atomHome) {
      process.env.ATOM_HOME = loadSettings.atomHome
    }
  }
})()
