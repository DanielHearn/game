
window.WebSocket = window.WebSocket || window.MozWebSocket

const serverIP = '86.151.188.17'
//const serverIP = '192.168.0.27';

const serverPort = '1337'
let connection = null
let canvas
let ctx
let connected = false

const playerSize = 32
const statusElement = document.querySelector('#connection_status')
const sendButton = document.querySelector('#send')
const playersToUpdate = [ ];
const playerMessages = [ ];
const playerSpeed = 4.0;
const mapSize = 500;
let clientPlayers = [ ]; // List of local instances of other clients' players
let playerId = null;
let positionX = 0;
let positionY = 0;
let playerColour = "#FF0000"
let playerName = ''
let activeKeys = {}
let initialised = false
const gameSpeed = 20;

window.onload = (event) => {
  init()
}

function send(msg) {
  connection.send(msg)
  console.log(`Sent message: ${msg}`)
}

function iterate() {
  move()
  setTimeout(() => { iterate() }, 1000/gameSpeed)
}

function render() {
  ctx.fillStyle = '#666';
  ctx.fillRect(0, 0, 500, 500);

  drawPlayer(positionX, positionY, playerColour, playerName)

  for (const client of clientPlayers) {
    if (client.id !== playerId) {
      const x = client.x
      const y = client.y
      drawPlayer(x, y, client.colour, client.name)
    }
  }

  window.requestAnimationFrame(render)
}

function sendInitRequest() {
  send(JSON.stringify({
    type: 'init_player'
  }))
}

function init() {
  console.log('Initialisation')
  connection = new WebSocket(`ws://${serverIP}:${serverPort}`)

  document.addEventListener('keydown', event => {
    const key = event.key.toLowerCase();
    activeKeys[key] = true
  });

  document.addEventListener('keyup', event => {
    const key = event.key.toLowerCase();
    delete activeKeys[key]
  });

  connection.onopen = function () {
    console.log('Connected')
    connected = true
    showConnectionStatus()
    sendInitRequest()
  }
  
  connection.onerror = function (error) {
    console.log(error)
  }
  
  connection.onmessage = function (message) {
    try {
      const data = JSON.parse(message.data)
      console.log('Received: ' + message.data)
      const messageType = data.type
      if (messageType === 'initialised_player') {
        playerId = data.data.user.id
        playerColour = data.data.user.colour
        playerName = data.data.user.name
        clientPlayers = data.data.players
        initialised = true
        iterate()
        render()
      } else if (messageType === 'players') {
        clientPlayers = data.data
      }
      console.log(clientPlayers)
    } catch (error) {
      console.error(error)
    }
  };

  initCanvas()
  sendButton.addEventListener('click', () => {
    send(JSON.stringify({type:"MESSAGE", message:"Random text", id:playerId}));
  })
}

function move(){
  let newX = positionX
  let newY = positionY
  let alreadyMoving = false
  if (activeKeys['a']) {
    if(alreadyMoving) {
      newX -= playerSpeed/2
    } else {
      newX -= playerSpeed
    }

    alreadyMoving = true
  }
  if (activeKeys['w']) {
    if(alreadyMoving) {
      newY -= playerSpeed/2
    } else {
      newY -= playerSpeed
    }
    alreadyMoving = true
  }
  if (activeKeys['d']) {
    if(alreadyMoving) {
      newX += playerSpeed/2
    } else {
      newX += playerSpeed
    }
    alreadyMoving = true
  }
  if (activeKeys['s']) {
    if(alreadyMoving) {
      newY += playerSpeed/2
    } else {
      newY += playerSpeed
    }
    alreadyMoving = true
  }
  if (positionX !== newX || positionY !== newY) {
    if (!checkWallCollision(newX, newY, mapSize) && !checkPlayerCollision(newX, newY, clientPlayers)) {
      positionX = newX
      positionY = newY
    }
  
    send(JSON.stringify({type: 'move', data: {id:playerId, x:positionX, y:positionY}}))
  }
}

function checkWallCollision(newX, newY, mapSize) {
  if (newX < 0 || 
      newY < 0 || 
      newX >= mapSize || 
      newY >= mapSize) {
    return true
  } else {
    return false
  }
}

function checkPlayerCollision(newX, newY, players) {
  for (let player of players) {
    if (playerId !== player.id) {
      if (newX < player.x + playerSize &&
        newX + playerSize > player.x &&
        newY < player.y + playerSize &&
        playerSize + newY > player.y) {
        return true
      } 
    }     
  }
  return false
}

function showConnectionStatus() {
  const statusMessage = connected ? 'Connected' : 'Not connected'
  statusElement.innerText = statusMessage
}

function initCanvas() {
  canvas = document.querySelector("#drawable");
  ctx = canvas.getContext("2d");
  ctx.fillRect(0, 0, 500, 500)
}

function drawPlayer(x, y, colour, name, id) {
  ctx.fillStyle = colour
  ctx.fillRect(x, y, playerSize, playerSize)
  ctx.fillStyle = '#FFFFFF';
  const nameOffset = name.length > 10 ? name.length*2 : 0
  ctx.fillText(name, x-nameOffset, y-6);

  for (const index in playerMessages) {
    let msg = playerMessages[index];
    console.log(msg, "TEE");
    if (msg.id == id) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(msg.message, x, y-(index*10));
    }
  }

}