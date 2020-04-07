'use strict'
process.title = 'node-chat'
const uuid = require("uuid/v4");

const webSocketsServerPort = 1337
const webSocketServer = require('websocket').server
const http = require('http')
let history = []
let clients = []
let users = []
const playerColours = [
  'red',
  'blue',
  'green',
  'purple',
  'pink'
]

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
          const newUser = {
            id: playerID,
            colour: randomPlayerColour(),
            name: playerID,
            x: 0,
            y: 0
          }
          reply = JSON.stringify({
            data: {
              user: newUser,
              players: users
            },
            type: 'initialised_player'
          });
          users.push(newUser)
          console.log(reply)
          broadcast(reply)
        } else if (messageType === 'move') {
          for (let user of users) {
            if (user.id === data.data.id) {
              user.x = data.data.x
              user.y = data.data.y
              break
            }
          }
          reply = JSON.stringify({
            data: users,
            type: 'players'
          });
          console.log(reply)
          broadcast(reply)
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

function randomPlayerColour() {
  return playerColours[Math.floor(Math.random() * playerColours.length)]
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
