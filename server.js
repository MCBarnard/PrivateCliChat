const express = require("express");
const app = express();
const server = require("http").createServer(app);
const io = require("socket.io")(server);
const config = require('./config.json')

const ngrok = require('ngrok');

ngrok.authtoken(config.ngrok_token);

(async function() {
    const url = await ngrok.connect(11111);

    // Listen on port 11111
    server.listen(11111, () => {
        console.log(`server running at ${url}`);
    });

    io.on('connection', socket => {
        // Broadcast a user's message to everyone else in the room
        socket.on('send', data => {
            io.emit('message', data);
        });
    });
})();