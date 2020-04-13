'use strict'
process.title = 'node-chat'
const uuidv4 = require('uuid/v4');
const webSocketsServerPort = 1337
const WebSocket = require('ws');
const http = require('http')
const mapColour = '#bdc3c7';
const mapWidth = 30;
const mapHeight = 100;

let history = []
let players = []
let mapData = [];

const playerColours = [
  '#27ae60',
  '#2980b9',
  '#8e44ad',
  '#2c3e50',
  '#f39c12',
  '#d35400',
  '#c0392b',
  '#bdc3c7',
  '#7f8c8d'
]

const server = http.createServer(function (request, response) {})
const wss = new WebSocket.Server({ server });

server.listen(webSocketsServerPort, function () {
  initialiseNewMap();
  console.log(new Date() + ' Server is listening on port ' + webSocketsServerPort)
})

wss.on('connection', function connection(ws, request, client) {
  console.log(`${new Date()} Connection from origin ${ws.origin}`)
  console.log(`Clients active: ${wss.clients.size}`)

  ws.on('message', function incoming(message) {
    console.log(`Received Message: ${message}`)
    const data = JSON.parse(message);
    let reply = ''
    if (data.type) {
      const messageType = data.type
      if (messageType === 'init_player') {
        const playerID = uuidv4()
        const newUser = {
          id: playerID,
          colour: randomPlayerColour(),
          name: data.data.name,
          x: 75,
          y: 75,
          direction: 0
        }
        reply = JSON.stringify({
          data: {
            user: newUser,
            players: players,
            map: {
              mapData: mapData, 
              colour: mapColour,
              width: mapWidth,
              height:mapHeight
            }
          },
          type: 'initialised_player'
        });
        players.push(newUser)
        ws.playerID = playerID
        ws.send(reply)

        // Update all clients with new player
        reply = JSON.stringify({
          data: players,
          type: 'players'
        });
        broadcast(reply)
      } else if (messageType === 'move') {
        for (let player of players) {
          if (player.id === data.data.id) {
            player.x = data.data.x
            player.y = data.data.y
            player.direction = data.data.direction
            break
          }
        }

        // Update all clients with new player position
        reply = JSON.stringify({
          data: players,
          type: 'players'
        });
        broadcast(reply)
      } else if (messageType === 'update_map') {
        const tileInteraction = data.tileInteraction;
        const tileIndexes = data.tileIndexes;
        switch (tileInteraction) {
          case 'delete':
            for (let tile of tileIndexes) {
              mapData[tile] = 0;
            }
            break;
        }
        broadcast(JSON.stringify({'type':'update_map', data:{index:tileIndexes, type:data.tileInteraction, newMapData:mapData}}));
      }else if (messageType === 'create_particle') {
        broadcast(JSON.stringify({'type':'create_particle', data:{x:data.x, y:data.y, rate:data.rate}}));
      } else if (messageType === 'message') {
        broadcast(JSON.stringify(data));
      }
    }
  })

  ws.on('close', function close() {
    console.log('Client disconnection')
    console.log(`Clients active: ${wss.clients.size}`)
    players = players.filter((player) => player.id !== ws.playerID)
    const reply = JSON.stringify({
      data: ws.playerID,
      type: 'close_player'
    });
    broadcast(reply)
  })
})

function randomPlayerColour() {
  return playerColours[Math.floor(Math.random() * playerColours.length)]
}

function broadcast(data) {
  wss.clients.forEach(function each(client) {
    if (client.readyState === WebSocket.OPEN) {
      // console.log(client, wss);
      if (client !== wss) client.send(data);
    }
  });
}

function blendTiles(type1, type2) {
  const randomNumber = Math.random()
  return randomNumber >= 0.5 ? type1 : type2;
}

function initialiseNewMap() {
  console.log("Initialising map");
  let goalCreated = false
  // Assume map is a square
  for (let i = 0; i < mapWidth*mapHeight; i ++) {
    let type = 1
    let depth = Math.floor(i / mapWidth);
    let firstLayer = depth >= 0 && depth < 40;
    let firstSecondBlendLayer = depth > 30 && depth < 40;
    
    let secondLayer = depth >= 40 && depth < 60;
    let secondThirdBlendLayer = depth > 50 && depth < 60;
    
    let thirdLayer = depth >= 60 && depth < 80;
    let thirdFourthBlendLayer = depth > 70 && depth < 80;
    
    let fourthLayer = depth >= 80 && depth < 100;
    
    if (firstLayer) {
      if (!firstSecondBlendLayer) {
        type = 3;
      } else {
        type = blendTiles(3, 4);
      }
    }  if (secondLayer) {
      if (!secondThirdBlendLayer) {
        type = 4;
      } else {
        type = blendTiles(4, 5);
      }
    }  if (thirdLayer) {
      if (!thirdFourthBlendLayer) {
        type = 5;
      } else {
        type = blendTiles(5, 6);
      }
    }  if (fourthLayer) {
        type = 6;
    }
    
    // const randomNumber = Math.random()
    // if(!goalCreated && i > (mapWidth*mapHeight) - 200) {
    //   type = 3
    //   goalCreated = true
    // } else if(randomNumber > 0.9) {
    //   type = 2
    // }
    mapData[i] = type
  }
}
