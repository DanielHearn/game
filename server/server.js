'use strict'
process.title = 'node-chat'
const uuidv4 = require('uuid/v4');
const webSocketsServerPort = 1337
const WebSocket = require('ws');
const http = require('http')
const mapColour = '#bdc3c7';
const mapWidth = 30;
const mapHeight = 30;


let history = []
let players = []

var mapData = [];

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
          name: playerID,
          x: 250,
          y: 250
        }
        reply = JSON.stringify({
          data: {
            user: newUser,
            players: players
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
      } else if (messageType === 'init_map') {
        broadcast(JSON.stringify({type:'initialised_map', mapData: mapData, colour:mapColour, width:mapWidth, height:mapHeight}));
      } else if (messageType === 'move') {
        for (let player of players) {
          if (player.id === data.data.id) {
            player.x = data.data.x
            player.y = data.data.y
            break
          }
        }

        // Update all clients with new player position
        reply = JSON.stringify({
          data: players,
          type: 'players'
        });
        broadcast(reply)
      }else if (messageType === 'update_map') {
        const tileInteraction = data.tileInteraction;
        const tileIndex = data.tileIndex;
        switch (tileInteraction) {
          case 'delete':
            mapData[tileIndex] = 0;
            break;
        }
        broadcast(JSON.stringify({'type':'update_map', data:{index:tileIndex, type:data.tileInteraction, newMapData:mapData}}));
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
      client.send(data);
    }
  });
}

function initialiseNewMap() {
  console.log("MAO");
  // Assume map is a square
  for (let i = 0; i < mapWidth*mapHeight; i ++) {
    mapData[i] = 1; // 1 being a filled block for now, 0 being an empty block
  }
}
