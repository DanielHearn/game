
window.WebSocket = window.WebSocket || window.MozWebSocket;

var connection = new WebSocket('ws://127.0.0.1:1337');

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
  button.addEventListener('click', () => {
    send('Cheese')
    console.log('send')
  })
}