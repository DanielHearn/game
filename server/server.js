'use strict'
process.title = 'node-chat'
const uuid = require("uuid/v4");

const webSocketsServerPort = 1337
const webSocketServer = require('websocket').server
const http = require('http')
let history = []
let clients = []

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
      var msg = message.utf8Data
      var data = JSON.parse(msg);
      console.log(`Received Message: ${msg}`)
      for (const client of clients) {
        if (data.id == null && data.type == "PLAYER") {
            data.id = uuid();
        }
        console.log(data);
        msg = JSON.stringify(data);
        client.connection.sendUTF(`${msg}`)
      }
      //connection.sendUTF('Message received')
    }
  })

  connection.on('close', function (connection) {
    clients = clients.filter((client) => client.remoteAddress !== connection.remoteAddress)
    console.log(`Clients: ${clients.length}`)
  })
})

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
