
window.WebSocket = window.WebSocket || window.MozWebSocket

const serverIP = '127.0.0.1'
//const serverIP = '192.168.0.27';

const serverPort = '1337'
let connection = null
let canvas
let ctx
let connected = false

const playerSize = 32
const statusElement = document.querySelector('#connection_status')
const playerCountElement = document.querySelector('#player_count')
const sendForm = document.querySelector('#send_form')
const playersToUpdate = [ ];
const playerMessages = [ ];
const playerSpeed = 4.0;
const mapSize = 500;
let clientPlayers = [ ]; // List of local instances of other clients' players
let activeKeys = {}
let initialised = false
let player;
const gameSpeed = 30;

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

  if (clientPlayers.length !== 0) {
    for (const client of clientPlayers) {
      if (client.id !== player.id) {
        const x = client.x
        const y = client.y
        let opacity = 1

        if (x < player.x + playerSize &&
          x + playerSize > player.x &&
          y < player.y + playerSize &&
          playerSize + y > player.y) {
          opacity = 0.33
        }    
        console.log(opacity)
        drawPlayer(x, y, client.colour, opacity, client.name, client.id, client.messages);
      }
    }
  }

  // Draw user's player on top of other players
  drawPlayer(player.x, player.y, player.colour, 1, player.name, player.id, player.messages)
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
      const previousPlayerCount = clientPlayers.length
      const messageType = data.type
      if (!initialised && messageType === 'initialised_player') {
        const userData = data.data.user
        const playerId = userData.id
        const playerColour = userData.colour
        const playerName = userData.name

        if (data.data.players.length > 0) {
          initiateClientPlayers(data.data.players);
        }

        player = new Player(userData.x, userData.y, playerColour, playerName, playerId);
        initialised = true
        iterate()
        render()
      } 
      console.log(data);

      if(initialised) {
        switch(data.type) {
          case 'players':
            updatePlayerObjects(data.data);
            break;
          case 'close_player':
            closePlayer(data);
            break;
          case 'message':
            updatePlayerMessages(data);
            break;
          }
      }

      showPlayerCount()
    } catch (error) {
      console.error(error)
    }
  };

  initCanvas()
  sendForm.addEventListener('submit', (e) => {
    e.preventDefault()
    let textInput = document.querySelector('#msg-box-input').value;
    if (textInput !== "") {
      send(JSON.stringify({type:"message", message:textInput, id:player.id}));
    }
  })
}

function updatePlayerMessages(messages) {
  const messageId = messages.id;

  if (messageId === player.id) {
    player.messages.push(messages);
  } else {
    for (const player of clientPlayers) {
      if (player.id === messageId) {
        player.messages.push(messages);
        return;
      }
    }
  }
}

function closePlayer(closePlayerId) {
  clientPlayers = clientPlayers.filter((player) => closePlayer.id === closePlayerId.data)
}

function initiateClientPlayers(data) {
  const cps = data;
  for (let player of cps) {
    const newPlayer = new Player(player.x, player.y, player.colour, player.name, player.id);
    clientPlayers.push(newPlayer);
  }
}

function updatePlayerObjects(data) {
  console.log(data, clientPlayers);
  for (let p of data) {
    let potentiallyNewPlayer = null;
    for (let clientPlayer of clientPlayers) {
      if (p.id === clientPlayer.id && player.id !== p.id) {
        clientPlayer.x = p.x;
        clientPlayer.y = p.y;
        console.log(clientPlayer);
        potentiallyNewPlayer = clientPlayer;
      }
    }
    if (potentiallyNewPlayer === null && p.id != player.id) {
      potentiallyNewPlayer = new Player(p.x, p.y, p.colour, p.name, p.id);
      clientPlayers.push(potentiallyNewPlayer);
    }
  }
}

function move(){
  let newX = player.x
  let newY = player.y
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
  if (player.x !== newX || player.y !== newY) {
    // Disabled player collision due to local movement
    //if (!checkWallCollision(newX, newY, mapSize) && !checkPlayerCollision(newX, newY, clientPlayers)) {
    if (!checkWallCollision(newX, newY, mapSize)) {
      player.x = newX
      player.y = newY
    }
    send(JSON.stringify({type: 'move', data: {id:player.id, x:player.x, y:player.y}}))
  }
}

function checkWallCollision(newX, newY, mapSize) {
  if (newX < 0 || 
      newY < 0 || 
      newX + playerSize >= mapSize || 
      newY + playerSize >= mapSize) {
    return true
  } else {
    return false
  }
}

function checkPlayerCollision(newX, newY, players) {
  for (let otherPlayer of players) {
    if (newX < player.x + playerSize &&
      newX + playerSize > player.x &&
      newY < player.y + playerSize &&
      playerSize + newY > player.y) {
      return true
    }    
  }
  return false
}

function showConnectionStatus() {
  const statusMessage = connected ? 'Connected' : 'Not connected'
  statusElement.innerText = statusMessage
}

function showPlayerCount() {
  playerCountElement.innerText = clientPlayers.length + 1
}

function initCanvas() {
  canvas = document.querySelector("#drawable");
  ctx = canvas.getContext("2d");
  ctx.fillRect(0, 0, 500, 500)
}

function drawPlayer(x, y, colour, opacity, name, id, messages) {
  ctx.globalAlpha = opacity;
  ctx.fillStyle = colour
  ctx.fillRect(x, y, playerSize, playerSize, opacity)
  ctx.fillStyle = '#FFFFFF';
  const nameOffset = name.length > 10 ? name.length*2 : 0
  ctx.fillText(name, x-nameOffset, y-6);

  for (const index in messages) {
    let msg = messages[index];
    if (msg.id == id) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(msg.message, x, y-(index*10));
    }
  }

}

class Player  {
  constructor(x, y, colour, name, id) {
    this.x = x;
    this.y = y;
    this.colour = colour;
    this.name = name;
    this.id = id;
    this.messages = [];
    this.updateMessage();
  }

  updateMessage() {
    let messages = this.messages;
    setInterval(function() {
      if(messages.length > 0) {
        messages.pop();
        this.messages = messages;
      }

    }, 5000);
  }
}