
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
const messageInput = document.querySelector('#msg-box-input')
const playerSpeed = 4.0;
const mapSize = 500;
const cursorSize = 12;
const cursorColour = 'black'
let mousePosition = null
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
        const direction = client.direction
        let opacity = 1

        if (x < player.x + playerSize &&
          x + playerSize > player.x &&
          y < player.y + playerSize &&
          playerSize + y > player.y) {
          opacity = 0.33
        }    
        drawPlayer(x, y, client.colour, opacity, client.name, client.id, client.messages);
      }
    }
  }

  // Draw user's player on top of other players
  drawPlayer(player.x, player.y, player.colour, 1, player.name, player.id, player.messages)
  drawCursor()
  
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

        player = new Player(userData.x, userData.y, userData.direction, playerColour, playerName, playerId);
        initialised = true
        iterate()
        render()
      } 

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
    let textInput = messageInput.value;
    messageInput.value = ''
    if (textInput !== "") {
      send(JSON.stringify({type:"message", message:textInput, id:player.id}));
    }
  })
}

function updatePlayerMessages(messages) {
  const messageId = messages.id;

  if (messageId === player.id) {
    player.messages.push(messages);
    setTimeout(() => {
      if(player.messages.length > 0) {
        player.messages.shift();
      }
    }, 5000)
  } else {
    for (const otherPlayer of clientPlayers) {
      if (otherPlayer.id === messageId) {
        otherPlayer.messages.push(messages);
        setTimeout(() => {
          if(otherPlayer.messages.length > 0) {
            otherPlayer.messages.shift();
          }
        }, 5000)
        return;
      }
    }
  }
}

function closePlayer(closePlayerId) {
  clientPlayers = clientPlayers.filter((otherPlayer) => otherPlayer.id !== closePlayerId.data)
}

function initiateClientPlayers(data) {
  const cps = data;
  for (let otherPlayer of cps) {
    const newPlayer = newsd Player(otherPlayer.x, otherPlayer.y, otherPlayer.colour, otherPlayer.name, otherPlayer.id);
    clientPlayers.push(newPlayer);
  }
}

function updatePlayerObjects(data) {
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

  if (player.x !== newX || player.y !== newY || player.direction !== player.lastDirection) {
    if (!checkWallCollision(newX, newY, mapSize)) {
      player.x = newX
      player.y = newY
    }
    send(JSON.stringify({type: 'move', data: {id:player.id, x:player.x, y:player.y, direction:player.direction}}))
  }

  if (player.direction !== player.lastDirection) {
    player.lastDirection = player.direction
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
  canvas.addEventListener('mousemove', handleMouse, false);
}

function drawCursor() {
  if (mousePosition) {
    ctx.fillStyle = cursorColour
    const gap = cursorSize*0.4
    const size = cursorSize*0.8
    const x = mousePosition.x - size
    const y = mousePosition.y - size
    ctx.fillRect(x, y + size, size, size / 2)
    ctx.fillRect(x + size + gap, y + size, size, size / 2)
    ctx.fillRect(x + size, y, size/2, size)
    ctx.fillRect(x + size, y + size + gap, size / 2, size)
  }
}

function drawPlayer(x, y, colour, opacity, name, id, messages) {
  ctx.globalAlpha = opacity;
  ctx.fillStyle = colour
  ctx.fillRect(x, y, playerSize, playerSize, opacity)
  ctx.fillStyle = '#FFFFFF';
  const nameOffset = name.length > 10 ? name.length*2 : 0
  ctx.fillText(name, x-nameOffset, y-6);

  for (const index in messages) {
    const msg = messages[index];
    const messageText = msg.message
    const messageY = y-(index*20)-20
    if (msg.id == id) {
      ctx.fillStyle = 'black'
      const messagePixelWidth = ctx.measureText(messageText).width
      ctx.fillRect(x, messageY-10, messagePixelWidth + 10, 15, opacity)
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(messageText, x+5, messageY);
    }
  }
}

function getMousePositionInElement(element, event) {
  const rect = element.getBoundingClientRect()
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  }
}

function handleMouse(e) {
  mousePosition = getMousePositionInElement(canvas, e)
  if(player) {
    const vector = {
      x: mousePosition.x - (player.x + playerSize),
      y: mousePosition.y - (player.y + playerSize)
    }
    const angleRad = Math.acos(vector.x / Math.sqrt(vector.x*vector.x + vector.y*vector.y))
    const angleDeg = angleRad * 180 / Math.PI;
    player.lastDirection = player.direction
    player.direction = angleDeg
  }
}

class Player  {
  constructor(x, y, direction, colour, name, id) {
    this.x = x;
    this.y = y;
    this.direction = direction;
    this.lastDirection = direction
    this.colour = colour;
    this.name = name;
    this.id = id;
    this.messages = [];
    this.direction = 0;
  }
}