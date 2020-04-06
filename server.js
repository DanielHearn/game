"use strict";
// Optional. You will see this name in eg. 'ps' or 'top' command
process.title = 'node-chat';
// Port where we'll run the websocket server
var webSocketsServerPort = 1337;
// websocket and http servers
var webSocketServer = require('websocket').server;
var http = require('http');
var history = [ ];
var clients = [ ];

var server = http.createServer(function(request, response) {
  // Not important for us. We're writing WebSocket server,
  // not HTTP server
});
server.listen(webSocketsServerPort, function() {
  console.log((new Date()) + " Server is listening on port "
      + webSocketsServerPort);
});
/**
 * WebSocket server
 */
var wsServer = new webSocketServer({
  // WebSocket server is tied to a HTTP server. WebSocket
  // request is just an enhanced HTTP request. For more info 
  // http://tools.ietf.org/html/rfc6455#page-6
  httpServer: server
});

// This callback function is called every time someone
// tries to connect to the WebSocket server
wsServer.on('request', function(request) {
  console.log(`${new Date()} Connection from origin ${request.origin}`)

  const connection = request.accept(null, request.origin);
  clients.push(createUser(connection))
  console.log(`Clients: ${clients.length}`)
  
  connection.on('message', function(message) {
    if (message.type === 'utf8') {
      const msg = message.utf8Data
      console.log(`Received Message: ${msg}`)
      for (let client of clients) {
        client.sendUTF(`A user sent: ${msg}`)
      }
      connection.sendUTF('Message received')
    }
  });
  // user disconnected
  connection.on('close', function(connection) {
    clients = clients.filter((client) => client.remoteAddress !== connection.remoteAddress)
    console.log(`Clients: ${clients.length}`)
  });
});


function createUser(connection) {
  return {
    connection: connection,
    name: 'JEFF',
    pos: {
      x: 0,
      y: 0
    }
  }
}