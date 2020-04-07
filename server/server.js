'use strict'
process.title = 'node-chat'
const uuid = require("uuid/v4");

const webSocketsServerPort = 1337
const webSocketServer = require('websocket').server
const http = require('http')
let history = []
let clients = []
let allPlayers = []
const server = http.createServer(function (request, response) {})
const wsServer = new webSocketServer({
  httpServer: server,
})

server.listen(webSocketsServerPort, function () {
  console.log(new Date() + ' Server is listening on port ' + webSocketsServerPort)
})

wsServer.on('request', function (request) {
  console.log(`${new Date()} Connection from origin ${request.origin}`)

  const connection = request.accept(null, request.origin)
  clients.push(createUser(connection))
  console.log(`Clients: ${clients.length}`)

  connection.on('message', function (message) {
    if (message.type === 'utf8') {
      const msg = message.utf8Data
      const data = JSON.parse(msg);
      let reply = ''
      console.log(`Received Message: ${msg}`)
      if (data.type) {
        const messageType = data.type
        if (messageType === 'init_player') {
          const playerID = uuid()
          var d = {
            id: playerID,
            x: 0,
            y: 0
          };
          reply = JSON.stringify({
            data: d,
            type: 'initialised_player'
          });
          allPlayers.push(d);
          // console.log(data)
          broadcast(reply)
        } else if (messageType === 'move') {
          reply = JSON.stringify(data);
          updateAllPlayers(data);
          var allMoveData = {};
          allMoveData.data = allPlayers;
          allMoveData.type = "all_move";
          console.log(allMoveData)
          broadcast(JSON.stringify(allMoveData))
        }
      }
      //connection.sendUTF('Message received')
    }
  })

  connection.on('close', function (connection) {
    clients = clients.filter((client) => client.remoteAddress !== connection.remoteAddress)
    console.log(`Clients: ${clients.length}`)
  })
})
function updateAllPlayers(data) {
  for (let index in allPlayers) {
    var player = allPlayers[index];

    if (player.id === data.data.id) {
      allPlayers[index].x = data.data.x;
      allPlayers[index].y = data.data.y;
    }
  }
}
function broadcast(data) {
  for (const client of clients) {
    client.connection.sendUTF(`${data}`)
  }
}

function createUser(connection) {
  return {
    connection: connection,
    name: 'JEFF',
    pos: {
      x: 0,
      y: 0,
    },
  }
}
