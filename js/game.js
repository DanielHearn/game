
window.WebSocket = window.WebSocket || window.MozWebSocket

const serverIP = '86.151.188.17'
const serverPort = '1337'
let connection = null
let canvas
let ctx
let connected = false

const playerColour = "#FF0000"
const playerSize = 32
const statusElement = document.querySelector('#connection_status')
const sendButton = document.querySelector('#send')

window.onload = (event) => {
  init()
}

function send(msg) {
  connection.send(msg)
  console.log(`Sent message: ${msg}`)
}

function init() {
  console.log('Initialisation')
  connection = new WebSocket(`ws://${serverIP}:${serverPort}`)

  connection.onopen = function () {
    console.log('Connected')
    connected = true
    showConnectionStatus()
  }
  
  connection.onerror = function (error) {
    console.log(error)
  }
  
  connection.onmessage = function (message) {
    console.log(message.data)

    if (message.data) {
      if (message.data.clients) {
        const clients = JSON.parse(message.data.clients)
  
        for (const client of clients) {
          const x = client.pos.x
          const y = client.pos.y
      
          drawPlayer(x, y)
        }
      }
    }
    ctx.fillRect(0, 0, 500, 500)
  };


  initCanvas()
  gameLoop()

  sendButton.addEventListener('click', () => {
    send('Random text')
  })
}

function showConnectionStatus() {
  const statusMessage = connected ? 'Connected' : 'Not connected'
  statusElement.innerText = statusMessage
}

function initCanvas() {
  canvas = document.querySelector("#drawable");
  ctx = canvas.getContext("2d");
}

function gameLoop() {
  const clear = setInterval(function() {
    send(JSON.stringify({id:0, x:10, y:10}))
  }, 500);
}


function drawPlayer(x, y) {
  ctx.fillStyle = playerColour
  ctx.fillRect(x, y, playerSize, playerSize)
}