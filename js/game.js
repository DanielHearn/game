
window.WebSocket = window.WebSocket || window.MozWebSocket

// const serverIP = '86.151.188.17'
const serverIP = '192.168.0.27';

const serverPort = '1337'
let connection = null
let canvas
let ctx
let connected = false

// const uuid = require("uuid/v4");

const playerColour = "#FF0000"
const playerSize = 32
const statusElement = document.querySelector('#connection_status')
const sendButton = document.querySelector('#send')
const clientPlayers = [ ]; // List of local instances of other clients' players
const playerId = null;

window.onload = (event) => {
  init()
  playerId = 1;
  // playerId = uuid(); // Generating a UUID for the player ID every instance (If they refresh this should change)
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
    
    const client = JSON.parse(message.data.client)
    updateClientPlayer(client);

    if (message.data) {
      if (message.data.clients) {
        
        for (const client of clientPlayers) {
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

function updateClientPlayer(data) {
  var clientPlayerExists = false;
  var clientPlayerID = data.id;
  for (const index in clientPlayers) {
    var client = clientPlayer[index];

    if (client.id == clientPlayerID) {
      clientPlayerExists = true;
      var clientPlayerX = data.x;
      var clientPlayerY = data.y;
      clientPlayer[i].x = clientPlayerX;
      clientPlayer[i].y = clientPlayerY;
      break;
    }
  }

  if (!clientPlayerExists) {
    clientPlayers.push({id:clientPlayerID, x:data.x, y:data.y});
  }
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
    send(JSON.stringify({id:playerId, x:10, y:10}))
  }, 500);
}


function drawPlayer(x, y) {
  ctx.fillStyle = playerColour
  ctx.fillRect(x, y, playerSize, playerSize)
}