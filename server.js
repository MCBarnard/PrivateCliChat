const express = require("express");
const app = express();
const server = require("http").createServer(app);
const io = require("socket.io")(server);

const ngrok = require('ngrok');
const token ='1PAnqWlO8mzWqZFOPk149eLp7FE_XYRYN6B5ryfm65qsMde9';
ngrok.authtoken(token);

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