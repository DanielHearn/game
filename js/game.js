
window.WebSocket = window.WebSocket || window.MozWebSocket

const serverIP = '86.151.188.17'
// const serverIP = '192.168.0.27';

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

  document.addEventListener('keydown', event => {
    const key = event.key.toLowerCase();
    switch(key) {
      case 'a':
        positionX -= playerSpeed;
        break;
      case 'd':
        positionX += playerSpeed;
        break;
      case 'w':
        positionY -= playerSpeed;
        break;
      case 's':
        positionY += playerSpeed;
        
        break;
    }
    move();
  });

  connection.onopen = function () {
    console.log('Connected')
    connected = true
    showConnectionStatus()
  }
  
  connection.onerror = function (error) {
    console.log(error)
  }
  
  connection.onmessage = function (message) {
    
    const client = JSON.parse(message.data)
    updateClientPlayer(client);
    console.log(client);
    if (playerId == null) {
      playerId = client.id;
    }
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, 500, 500);
    let x;
    let y;
    if (client.type == "PLAYER") {  
      for (const client of clientPlayers) {
        x = client.x
        y = client.y
      }
    } else if (client.type == "MESSAGE") {
      console.log("FUCK");
      playerMessages.push({id:client.id, message:client.message});
    }

      drawPlayer(x, y, client.id)
    
  };
  initCanvas()
  sendButton.addEventListener('click', () => {
    send(JSON.stringify({type:"MESSAGE", message:"Random text", id:playerId}));
  })
}

function move(){
  send(JSON.stringify({type:"PLAYER", id:playerId, x:positionX, y:positionY}))
}

function lerp (start, end, amt){
  return (1-amt)*start+amt*end
}
/*
  This method takes the player data, check's if that player is currently on the local players map,
  if not, then just add it, and keep track. Otherwise, update that players' position.
*/
function updateClientPlayer(data) {
  var clientPlayerExists = false;
  var clientPlayerID = data.id;
  for (const index in clientPlayers) {
    var client = clientPlayers[index];
    if (client.id == clientPlayerID) {
      clientPlayerExists = true;
      var clientPlayerX = data.x;
      var clientPlayerY = data.y;
      clientPlayers[index].x = clientPlayerX;
      clientPlayers[index].y = clientPlayerY;
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
  console.log(playerMessages)
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