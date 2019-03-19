/**
 * Blue2 Cooper Atkins Adapter
 */
 /* global TextDecoder */
function Blue2CA () {
  var adapters = {
    'run': function () {
      return run()
    }
  }

  function run () {
    App().log('Requesting bluetooth device...')
    var blue2TempService = 'f2b32c77-ea68-464b-9cd7-a22cbffb98bd'
    var dummyFidoService = `F1D0FFFD-0000-1000-8000-00805F9B34FB`
    var blue2TempASCIICharacteristic = '78544003-4394-4fc2-8cfd-be6a00aa701b'
    navigator.bluetooth.requestDevice({
      // filters: [],
      acceptAllDevices: true,
      optionalServices: [dummyFidoService]})
    .then(device => {
      App().log('Connecting to device ...')
      return device.gatt.connect()
    })
    .then(server => {
      App().log('Getting device service...')
      return server.getPrimaryService(blue2TempService)
    })
    .then(service => {
      App().log('Getting device characteristics...')
      return service.getCharacteristics()
    })
    .then(characteristics => {
      let queue = Promise.resolve()
      let decoder = new TextDecoder('utf-8')
      // DODC HERE
      // file:///C:/Users/Admin/Dropbox/Pongolabs%20-%20Team/Projects/Clients/MartinBrower-QIP/170516%20Bluetooth%20probes/Bluetooth%20Wand%20API-1.pdf
      characteristics.forEach(characteristic => {
        if (characteristic && characteristic.uuid && characteristic.uuid === blue2TempASCIICharacteristic) {
          queue = queue.then(_ => characteristic.readValue()).then(value => {
            value = decoder.decode(value)
            value = value.replace(/[^A-Z0-9.]+/g, ' ').trim()
            App().log('Raw data: ' + value)
            if (value.indexOf(' ') === -1) {
              App().log('Temperature characteristic value not found!')
              return
            }
            var valueArr = value.split(' ')
            if (valueArr.length !== 2) {
              App().log('Temperature characteristic format invalid! ' + valueArr.length)
              return
            }
            var temp = valueArr[0]
            var scale = valueArr[1] // F or C
            if (scale === 'F') {
              temp = (temp - 32) * 5 / 9
              temp = Math.round(temp * 100) / 100
              scale = 'C'
            }
            App().log('Temperature: ' + temp + ' ' + scale)
          })
        }
      })
      return queue
    })
    .catch(error => {
      App().log('Argh! ' + error)
    })
  }

  return adapters
}

window.exports = Blue2CA
