const express = require("express");
const app = express();
const server = require("http").createServer(app);
const io = require("socket.io")(server);

// Listen on port 11111
const PORT = process.env.PORT || 11111;
server.listen(PORT, () => {
    console.log(`server running at http://0.0.0.0:${PORT}`);
});

io.on('connection', socket => {
    // Broadcast a user's message to everyone else in the room
    socket.on('send', data => {
        io.emit('message', data);
    });
});