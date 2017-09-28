/**
 * Blue2 Cooper Atkins Adapter
 */
 /* global TextDecoder */
function Blue2CA () {
  var adapters = {
    'init': function () {
      return init()
    },
    'test': function () {
      return test()
    }
  }

  function test () {
    App().log('Requesting any Bluetooth Device...')
    navigator.bluetooth.requestDevice({
     // filters: [...] <- Prefer filters to save energy & show relevant devices.
      acceptAllDevices: true,
      optionalServices: ['device_information']})
    .then(device => {
      App().log('Connecting to GATT Server...')
      return device.gatt.connect()
    })
    .then(server => {
      App().log('Getting Device Information Service...')
      return server.getPrimaryService('device_information')
    })
    .then(service => {
      App().log('Getting Device Information Characteristics...')
      return service.getCharacteristics()
    })
    .then(characteristics => {
      let queue = Promise.resolve()
      let decoder = new TextDecoder('utf-8')
      characteristics.forEach(characteristic => {
        queue = queue.then(_ => characteristic.readValue()).then(value => {
          App().log('>> Characteristic: ' + characteristic.uuid + ' ' + getSupportedProperties(characteristic) + ' value: ' + decoder.decode(value))
        })
      })
      return queue
    })
    .catch(error => {
      App().log('Argh! ' + error)
    })
  }

  var bluetoothDevice
  var batteryLevelCharacteristic

  var init = function () { }

  var onReadBatteryLevelButtonClick = function () {
    return (bluetoothDevice ? Promise.resolve() : requestDevice())
    .then(connectDeviceAndCacheCharacteristics)
    .then(_ => {
      App().log('Reading Battery Level...')
      return batteryLevelCharacteristic.readValue()
    })
    .catch(error => {
      App().log('Argh! ' + error)
    })
  }

  var requestDevice = function () {
    App().log('Requesting any Bluetooth Device...')
    return navigator.bluetooth.requestDevice({
     // filters: [...] <- Prefer filters to save energy & show relevant devices.
      acceptAllDevices: true,
      optionalServices: ['battery_service']})
    .then(device => {
      bluetoothDevice = device
      bluetoothDevice.addEventListener('gattserverdisconnected', onDisconnected)
    })
  }

  var connectDeviceAndCacheCharacteristics = function () {
    if (!BLEUtils().isWebBluetoothEnabled()) {
      return Promise.resolve()
    }
    if (bluetoothDevice.gatt.connected && batteryLevelCharacteristic) {
      return Promise.resolve()
    }

    App().log('Connecting to GATT Server...')
    return bluetoothDevice.gatt.connect()
    .then(server => {
      var servicename = 'device_information'
      App().log('Getting Services for' + servicename)
      return server.getPrimaryService(servicename)
    })
    .then(services => {
      App().log('Getting Characteristics...')
      let queue = Promise.resolve()
      services.forEach(service => {
        queue = queue.then(_ => service.getCharacteristics().then(characteristics => {
          App().log('> Service: ' + service.uuid)
          characteristics.forEach(characteristic => {
            App().log('>> Characteristic: ' + characteristic.uuid + ' ' + getSupportedProperties(characteristic))
          })
        }))
      })
      return queue
    })
    .catch(error => {
      App().log(error)
    })
  }

  /* Utils */
  var getSupportedProperties = function (characteristic) {
    let supportedProperties = []
    for (const p in characteristic.properties) {
      if (characteristic.properties[p] === true) {
        supportedProperties.push(p.toUpperCase())
      }
    }
    return '[' + supportedProperties.join(', ') + ']'
  }

  /* This function will be called when `readValue` resolves and
   * characteristic value changes since `characteristicvaluechanged` event
   * listener has been added. */
  var handleBatteryLevelChanged = function (event) {
    let batteryLevel = event.target.value.getUint8(0)
    App().log('> Battery Level is ' + batteryLevel + '%')
  }

  var onStartNotificationsButtonClick = function () {
    App().log('Starting Battery Level Notifications...')
    batteryLevelCharacteristic.startNotifications()
    .then(_ => {
      App().log('> Notifications started')
      document.querySelector('#startNotifications').disabled = true
      document.querySelector('#stopNotifications').disabled = false
    })
    .catch(error => {
      App().log('Argh! ' + error)
    })
  }

  var onStopNotificationsButtonClick = function () {
    App().log('Stopping Battery Level Notifications...')
    batteryLevelCharacteristic.stopNotifications()
    .then(_ => {
      App().log('> Notifications stopped')
      document.querySelector('#startNotifications').disabled = false
      document.querySelector('#stopNotifications').disabled = true
    })
    .catch(error => {
      App().log('Argh! ' + error)
    })
  }

  var onResetButtonClick = function () {
    if (batteryLevelCharacteristic) {
      batteryLevelCharacteristic.removeEventListener('characteristicvaluechanged', handleBatteryLevelChanged)
      batteryLevelCharacteristic = null
    }
    // Note that it doesn't disconnect device.
    bluetoothDevice = null
    App().log('> Bluetooth Device reset')
  }

  var onDisconnected = function () {
    App().log('> Bluetooth Device disconnected')
    connectDeviceAndCacheCharacteristics()
    .catch(error => {
      App().log('Argh! ' + error)
    })
  }

  return adapters
}

window.exports = Blue2CA
