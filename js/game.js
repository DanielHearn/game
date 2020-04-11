
window.WebSocket = window.WebSocket || window.MozWebSocket

// const serverIP = '81.154.80.108'
const serverIP = '127.0.0.1';
const serverPort = '1337'

const playerSize = 32
const statusElement = document.querySelector('#connection_status')
const playerCountElement = document.querySelector('#player_count')
const sendForm = document.querySelector('#send_form')
const messageInput = document.querySelector('#msg_box_input')
const gameContainer = document.querySelector('.game-container')
const loadingElement = document.querySelector('#loading_status')
const chatListElement = document.querySelector('#chat_list')
const startButton = document.querySelector('#start')
const nameInput = document.querySelector('#name_box_input')
const gameWrapper = document.querySelector('#game')
const introWrapper = document.querySelector('#intro')
const nameForm = document.querySelector('#name_form')
const playerSpeed = 4.0;
const gameSpeed = 30;
const cursorSize = 12;
const cursorColour = 'black'
const backgroundColour = '#3a3211'
const skyColour = '#56b8fa'
const tileColours = {
  0: '#644515',
  1: '#222',
  2: '#333',
  3: '#758918',
  4: '#B68C5D',
  5: '#F0F0B5',
  6: '#7C8485',
  7: '#392B1B',
};
const fontSize = 14
const fontFamily = 'Noto Sans'
let mousePosition = null
let clientPlayers = [ ]; // List of local instances of other clients' players
let activeKeys = {}
let initialised = false
let mapInitialised = false;
let player;
let gameMap;
let camera;
let mapHeight = 0;
let mapWidth = 0;
let connection = null
let ctx
let connected = false
let gameFocused = true
let tileDestroyRate = 0.5;
let collidingTiles = [];
let chatHistory = []

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

function sendInitRequest(name) {
  send(JSON.stringify({
    type: 'init_player',
    data: {
      name: name
    }
  }));
}

function init() {
  console.log('Initialisation')

  nameForm.addEventListener('submit', (e) => {
    e.preventDefault()
    let name = nameInput.value;
    console.log(name)
    if (name !== "") {
      sendInitRequest(name)
    }
  })


  messageInput.addEventListener('focus', () => {
    gameFocused = false
  })
  messageInput.addEventListener('blur', () => {
    gameFocused = true
  })

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
    //showConnectionStatus()
    //sendInitRequest()
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
      if (!mapInitialised && !initialised && messageType === 'initialised_player') {
        introWrapper.style.display = 'none'
        gameWrapper.style.display = 'flex'
        showConnectionStatus()
        const userData = data.data.user
        const playerId = userData.id
        const playerColour = userData.colour
        const playerName = userData.name
        const mapInfo = data.data.map
        const colour = mapInfo.colour;
        const mapData = mapInfo.mapData;
        const width = mapInfo.width;
        const height = mapInfo.height;
        gameMap = new GameMap(colour, mapData, width, height);
        mapWidth = width * gameMap.tileSize
        mapHeight = height * gameMap.tileSize
        gameMap.initialiseTiles();
        mapInitialised = true;

        player = new Player(userData.x, userData.y, userData.direction, playerColour, playerName, playerId);
        camera = new Camera(player.x, player.y);
        initialised = true
        iterate()
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
          case 'update_map':
            updateMap(data.data);
         
          }
      }

      showPlayerCount()
    } catch (error) {
      console.error(error)
    }
  };

  sendForm.addEventListener('submit', (e) => {
    e.preventDefault()
    let textInput = messageInput.value;
    messageInput.value = ''
    if (textInput !== "") {
      send(JSON.stringify({type:"message", message:textInput, id:player.id, name:player.name}));
    }
  })
}

function updateMap(mapData) {
  let tileIndex = mapData.index;
  let interactionType = mapData.type;
  let newMapData = mapData.newMapData;
  switch (interactionType) {
    case 'delete':
      const tileToDelete = gameMap.tiles[tileIndex];
      gameMap.tiles[tileIndex] = new MapTile(tileColours[0], tileToDelete.x, tileToDelete.y, 0);
      break;   
  }
  // gameMap.mapData = mapData;
}

function updatePlayerMessages(messages) {
  const messageId = messages.id;
  chatHistory.push(messages)
  renderChatHistoryMessage(messages)
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

function updatePlayerObjects(data) {
  for (let updatedPlayer of data) {
    if(player.id !== updatedPlayer.id) {
      const matchingPlayers = clientPlayers.filter(clientPlayer => updatedPlayer.id === clientPlayer.id)
      if(!matchingPlayers.length) {
        const newClientPlayer = new Player(updatedPlayer.x, updatedPlayer.y, updatedPlayer.direction, updatedPlayer.colour, updatedPlayer.name, updatedPlayer.id)
        clientPlayers.push(newClientPlayer);
      } else {
        const existingPlayer = matchingPlayers[0]
        existingPlayer.x = updatedPlayer.x;
        existingPlayer.y = updatedPlayer.y;
        existingPlayer.direction = updatedPlayer.direction;
      }
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

  if(gameFocused) {
    if (player.x !== newX || player.y !== newY) {
      if (!checkWallCollision(newX, newY, mapWidth, mapHeight) && !checkTileCollision(newX, newY)) {
        camera.x += player.x - newX;
        camera.y += player.y - newY;
        player.x = newX
        player.y = newY
      }
      send(JSON.stringify({type: 'move', data: {id:player.id, x:player.x, y:player.y}}))
    }
    if (mapInitialised) {
      //console.log(collidingTiles);
      for (let tile of collidingTiles) {
        const tileInteracted = tile;
        let i = gameMap.tiles.findIndex(t => t === tile);

        destroyTile(tileInteracted, i, function() {
          gameMap.mapData[i] = 0;
          gameMap.tiles[i] = new MapTile(tileColours[0], tileInteracted.x, tileInteracted.y, 0);
          send(JSON.stringify({type:'update_map', tileIndex:i, tileInteraction:'delete'}));
        });
      }
      collidingTiles = []
    }
  }
}

function getTileIndex(tile) {
  return tile;
}


function destroyTile(tile, i, callback) {
  var hardness = tile.hardness;
  if (hardness <= 0) {
    callback();
  } else {
    let currentColour = tile.colour;
    tile.hardness -= tileDestroyRate;
    let alpha = tile.hardness / tile.startingHardness;
    alpha = Math.floor(alpha * 100);
    tile.colour = currentColour + toString(alpha);
  }
}

function checkTileCollision(newX, newY) {
  let playerTilePositionX = Math.floor(newX/gameMap.tileSize);
  let playerTilePositionY = Math.floor(newY/gameMap.tileSize);
  let topLCorner = playerTilePositionX + playerTilePositionY * gameMap.width;
  let topRCorner = (playerTilePositionX + (2)) + playerTilePositionY * gameMap.width; // that 2 can be changed into teh player width/tileSize
  let bottomLCorner = playerTilePositionX + (playerTilePositionY + (2)) * gameMap.width;
  let bottomRCorner = (playerTilePositionX + (2)) + (playerTilePositionY + (2)) * gameMap.width;
  let top = (playerTilePositionX+1) + playerTilePositionY * gameMap.width;
  let bottom = (playerTilePositionX + (1)) + (playerTilePositionY+2) * gameMap.width; // that 2 can be changed into teh player width/tileSize
  let left = playerTilePositionX + (playerTilePositionY + (1)) * gameMap.width;
  let right = (playerTilePositionX + (2)) + (playerTilePositionY + (1)) * gameMap.width;
  

  let topLTile = gameMap.tiles[topLCorner];
  let topRTile = gameMap.tiles[topRCorner];
  let bottomLTile = gameMap.tiles[bottomLCorner];
  let bottomRTile = gameMap.tiles[bottomRCorner];
  let topTile = gameMap.tiles[top];
  let bottomTile = gameMap.tiles[bottom];
  let leftTile = gameMap.tiles[left];
  let rightTile = gameMap.tiles[right];

  topLCorner = gameMap.mapData[topLCorner] !== 0;
  topRCorner = gameMap.mapData[topRCorner] !== 0;
  bottomLCorner = gameMap.mapData[bottomLCorner] !== 0;
  bottomRCorner = gameMap.mapData[bottomRCorner] !== 0;
  top = gameMap.mapData[top] !== 0;
  bottom = gameMap.mapData[bottom] !== 0;
  left = gameMap.mapData[left] !== 0;
  right = gameMap.mapData[right] !== 0;

  
  if (topLCorner) { collidingTiles.push(topLTile) }
  if (topRCorner) { collidingTiles.push(topRTile) }
  if (bottomLCorner) { collidingTiles.push(bottomLTile) }
  if (bottomRCorner) { collidingTiles.push(bottomRTile) }
  if (top) { collidingTiles.push(topTile) }
  if (bottom) { collidingTiles.push(bottomTile) }
  if (left) { collidingTiles.push(leftTile) }
  if (right) { collidingTiles.push(rightTile) }

  let collide = 
  (topLCorner) ||
  (topRCorner)||
  (bottomRCorner)||
  (bottomLCorner) ||
  (top) ||
  (bottom)||
  (left)||
  (right);

  return collide;
}


function checkWallCollision(newX, newY, mapWidth, mapHeight) {
  if (newX < 0 || 
      newY < 0 || 
      newX + playerSize >= mapWidth || 
      newY + playerSize >= mapHeight) {
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
  
function getMousePositionInElement(element, event) {
  const rect = element.getBoundingClientRect()
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  }
}

function handleMouse(e) {
  mousePosition = getMousePositionInElement(camera.canvas, e)
}

function renderChatHistoryMessage(message) {
  const listElement = document.createElement('li')
  listElement.innerText = `${message.name}: ${message.message}`
  chatListElement.append(listElement)
  chatListElement.scrollIntoView(false);
}

class Player  {
  constructor(x, y, direction, colour, name, id) {
    this.x = x;
    this.y = y;
    this.direction = direction;
    this.colour = colour;
    this.name = name;
    this.id = id;
    this.messages = [];
    this.direction = 0;
  }
}

class GameMap {
  constructor(colour, mapData, width, height) {
    this.mapData = mapData;
    this.width = width;
    this.height = height;
    this.tileSize = 16;
    this.tiles = [];
  }

  initialiseTiles() {
    for (let i = 0; i < this.mapData.length; i ++) {
      const tileX = Math.floor(i % this.width) * this.tileSize;
      const tileY = Math.floor(i / this.width) * this.tileSize;
      const tileType = this.mapData[i];

      this.tiles.push(new MapTile(tileColours[tileType], tileX, tileY, tileType));
    }
  }
}

class MapTile {
  constructor(colour, x, y, type) {
    this.colour = colour;
    this.x = x;
    this.y = y;
    this.type = type;
    this.hardness = 1;
    this.startingHardness = this.hardness;    
  }
}

class Camera {
  constructor(x, y) {
    this.lastCanvasWidth = window.innerWidth
    this.lastCanvasHeight = window.innerHeight
    this.viewportWidth = this.lastCanvasWidth;
    this.viewportHeight = this.lastCanvasHeight;
    
    this.canvas = document.createElement("canvas")
    this.x = Math.floor((this.viewportWidth - x - (playerSize/2)) - this.viewportWidth/2)
    this.y = Math.floor((this.viewportHeight - y - (playerSize/2)) - this.viewportHeight/2) 

    gameContainer.appendChild(this.canvas)
    this.setCanvasSize()
    this.ctx = this.canvas.getContext("2d")
    this.ctx = this.canvas.getContext("2d");
    this.ctx.font = `${fontSize}px ${fontFamily}`
    this.ctx.fillRect(0, 0, this.viewportWidth, this.viewportHeight)
    this.canvas.addEventListener('mousemove', handleMouse, false);
    window.addEventListener('resize', this.setCanvasSize.bind(this), false)
    this.render()
  }

  setCanvasSize() {
    const differenceWidth = this.lastCanvasWidth - window.innerWidth
    const differenceHeight = this.lastCanvasHeight - window.innerHeight
    this.lastCanvasWidth = window.innerWidth
    this.lastCanvasHeight = window.innerHeight
    this.viewportWidth = window.innerWidth
    this.viewportHeight = window.innerHeight
    
    this.x =  Math.floor(this.x - (differenceWidth/2))
    this.y =  Math.floor(this.y - (differenceHeight/2))
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
  }

  render() {
    this.ctx.fillStyle = backgroundColour;
    this.ctx.fillRect(0, 0, this.viewportWidth, this.viewportHeight);
    this.drawMap();
  
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
          this.drawPlayer(x + this.x, y + this.y, client.colour, opacity, client.name, client.id, client.messages);
        }
      }
    }
  
  
    // Draw user's player on top of other players
    this.drawPlayer(player.x + this.x, player.y + this.y, player.colour, 1, player.name, player.id, player.messages)
    this.drawCursor()
    
    window.requestAnimationFrame(this.render.bind(this))
  }

  drawCursor() {
    if (mousePosition) {
      this.ctx.fillStyle = cursorColour
      const gap = cursorSize*0.4
      const size = cursorSize*0.8
      const x = mousePosition.x - size
      const y = mousePosition.y - size
      this.ctx.fillRect(x, y + size, size, size / 2)
      this.ctx.fillRect(x + size + gap, y + size, size, size / 2)
      this.ctx.fillRect(x + size, y, size/2, size)
      this.ctx.fillRect(x + size, y + size + gap, size / 2, size)
    }
  }
  
  drawPlayer(x, y, colour, opacity, name, id, messages) {
    this.ctx.globalAlpha = opacity;
    this.ctx.fillStyle = colour
    this.ctx.fillRect(x, y, playerSize, playerSize, opacity)
    this.ctx.fillStyle = '#FFFFFF';
    const nameOffset = name.length > 10 ? name.length*2 : 0
    this.ctx.fillText(name, x-nameOffset, y-6);
  
    for (const index in messages) {
      const msg = messages[index];
      const messageText = msg.message
      if (msg.id == id) {
        this.ctx.fillStyle = 'black'
        const messageSize = this.ctx.measureText(messageText)
        console.log(messageSize)
        const messageY = y-(index*20)-(messageSize.actualBoundingBoxAscent*3)
        this.ctx.fillRect(x, messageY-(messageSize.actualBoundingBoxAscent/1.5), messageSize.width + 10, messageSize.actualBoundingBoxAscent + (messageSize.actualBoundingBoxAscent/1.5), opacity)
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.fillText(messageText, x+5, messageY+(messageSize.actualBoundingBoxAscent/1.5));
      }
    }
  }
  
  drawMap() {
    if (mapInitialised === true) {

      // Draw sky
      this.ctx.fillStyle = skyColour;
      this.ctx.fillRect(-this.viewportWidth + this.x, -this.viewportHeight+ this.y, this.viewportWidth*2, this.viewportHeight);

      // Draw map tiles
      for (let tile of gameMap.tiles) {
        this.ctx.fillStyle = tile.colour;
        this.ctx.fillRect(tile.x + this.x, tile.y + this.y, gameMap.tileSize, gameMap.tileSize);
      }
    }
  }
}