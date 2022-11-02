const express = require("express");
const app = express();
const server = require("http").createServer(app);
const io = require("socket.io")(server);

// Listen on port 11111
server.listen(11111, () => {
    console.log(`server running at http://localhost:11111`);
});

io.on('connection', socket => {
    // Broadcast a user's message to everyone else in the room
    socket.on('send', data => {
        io.emit('message', data);
    });
});