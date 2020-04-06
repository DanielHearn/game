
window.WebSocket = window.WebSocket || window.MozWebSocket;

var connection = new WebSocket('ws://86.151.188.17:1337');


connection.onopen = function () {
  console.log('Connected')
};

connection.onerror = function (error) {
  console.log(error)
};

connection.onmessage = function (message) {
  console.log(message.data)
  var clients = JSON.parse(message.data.clients);

  for (const client of clients) {
    var x = client.pos.x;
    var y = client.pos.y;

    drawPlayer(x, y);
  }
 
  ctx.fillRect(0, 0, 500, 500); // Clear Screen
};

function send(msg) {
  connection.send(msg);
}
var canvas;
var ctx;
window.onload = (event) => {
  canvas = document.querySelector("#drawable");
  ctx = canvas.getContext("2d");
  console.log('loaded')
  const button = document.querySelector('#send')
  gameLoop();
  button.addEventListener('click', () => {
    send('Dan Likes penis')
    console.log('send')
  })
}
function gameLoop() {
  var clear = setInterval(function() {
    send(JSON.stringify({id:0, x:10, y:10}))
  }, 500);
}


function drawPlayer(x, y) {
  ctx.fillStyle = "#FF0000";
  ctx.fillRect(x, y, 32, 32);
}