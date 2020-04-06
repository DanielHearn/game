
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
};

function send(msg) {
  connection.send(msg);
}

window.onload = (event) => {
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
    for (let player of clients) {
      console.log(player);
      drawPlayer(player.pos.x, player.pos.y);
    }
  }, 1000/60);
}

var canvas = document.getElementById("drawable");
function drawPlayer(x, y) {
  var ctx = canvas.getContext("2d");
  ctx.fillRect(0, 0, 500, 500); // Clear Screen
  ctx.fillStyle = "#FF0000";
  ctx.fillRect(x, y, 32, 32);
}