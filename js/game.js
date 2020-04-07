
window.WebSocket = window.WebSocket || window.MozWebSocket

const serverIP = '86.151.188.17'
//const serverIP = '192.168.0.27';

const serverPort = '1337'
let connection = null
let canvas
let ctx
let connected = false

const playerColour = "#FF0000"
const playerSize = 32
const statusElement = document.querySelector('#connection_status')
const sendButton = document.querySelector('#send')
const clientPlayers = [ ]; // List of local instances of other clients' players
const playersToUpdate = [ ];
const playerMessages = [ ];
const playerSpeed = 2.0;
var playerId = null;
var positionX = 0;
var positionY = 0;
let activeKeys = {}
let initialised = false
const gameSpeed = 60;

window.onload = (event) => {
  init()
}

function send(msg) {
  connection.send(msg)
  console.log(`Sent message: ${msg}`)
}

function iterate() {
  window.requestAnimationFrame(interval)
}

function interval() {
  move()
  render()
  setTimeout(() => { iterate() }, 1000/gameSpeed)
}

function render() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, 500, 500);

  for (const client of clientPlayers) {
    const x = client.x
    const y = client.y
    drawPlayer(x, y)
  }
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
    const data = JSON.parse(message.data)
    console.log('Received: ' + message.data)
    try {
      const messageType = data.type
      if (messageType === 'initialised_player') {
        playerId = data.data.id
        initialised = true
        iterate()
      }
      if(initialised) {
        updateClientPlayer(data.data);
      }
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
    positionX = newX
    positionY = newY
  
    send(JSON.stringify({type: 'move', data: {id:playerId, x:positionX, y:positionY}}))
  }
}

function lerp (start, end, amt){
  return (1-amt)*start+amt*end
}
/*
  This method takes the player data, check's if that player is currently on the local players map,
  if not, then just add it, and keep track. Otherwise, update that players' position.
*/
function updateClientPlayer(data) {
  let clientPlayerExists = false;
  const clientPlayerID = data.id;
  for (const index in clientPlayers) {
    const client = clientPlayers[index];

    if (client.id === clientPlayerID) {
      clientPlayerExists = true;
      if (data.x && data.y) {
        const clientPlayerX = data.x;
        const clientPlayerY = data.y;
        client.x = clientPlayerX;
        client.y = clientPlayerY;
      }
      break;
    }
  }

  if (!clientPlayerExists) {
    clientPlayers.push({id:clientPlayerID, x:data.x, y:data.y});
    console.log("ADDING NEW PLAYER", clientPlayers);
  }
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

function drawPlayer(x, y, id) {
  ctx.fillStyle = playerColour
  ctx.fillRect(x, y, playerSize, playerSize)

  for (const index in playerMessages) {
    let msg = playerMessages[index];
    console.log(msg, "TEE");
    if (msg.id == id) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(msg.message, x, y-(index*10));
    }
  }

}