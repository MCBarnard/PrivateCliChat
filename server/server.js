import express from "express";
const app = express();
import { createServer } from "http";
import { Server } from "socket.io";
const httpServer = createServer(app);
const io = new Server(httpServer);

import { createRequire } from "module";
const require = createRequire(import.meta.url);
const Auth = require("../config/ClientAuth.json");

// Listen on port 11111
const PORT = process.env.PORT || 11111;
httpServer.listen(PORT, () => {
    console.log(`server running at http://0.0.0.0:${PORT}`);
});

// Keeps track of who is in the room
let usersPresentInRoom = [];

// Keeps track of a vote scenario
let voting = false;
let voteTotal = 0;
let votes = [];

// Decides if we want to authenticate connections to the server
const allow_anonymous_connections = Auth.allow_unauthorized_connections;

io.use((socket, next) => {
    // Fetch the data
    const user = socket.handshake.auth.user;
    const username = socket.handshake.auth.username;
    const secret = socket.handshake.auth.secret;

    // Ensure we have some data to use for user management
    const dataIsPresent = user && username;

    // Authentication
    const validCredentials = Auth.clients[user] !== undefined && Auth.clients[user].secret === secret;

    if (dataIsPresent && (validCredentials || allow_anonymous_connections)) {
        // Someone joined the room
        io.emit('joined-the-room', `${username} has joined the room!`);
        const userObject = {
            user: user,
            username: username,
            id: socket.id
        };
        usersPresentInRoom.push(userObject);
        next();
    } else {
        next(new Error("unauthorized"))
    }
});

io.on('connection', socket => {
    // Broadcast a user's message to everyone else in the room
    socket.on('send', data => {
        console.log(data);
        io.emit('message', data);
    });

    // Send a message directly to one client
    socket.on('direct-message', data => {
        // Fetch the clients
        let destinationClient;
        let sourceClient;
        usersPresentInRoom.forEach(item => {
            if (item.user === data.to) {
                destinationClient = item;
            }
            if (item.user === data.from) {
                sourceClient = item;
            }
        });



        // Edit the payload to contain usernames
        data.to = destinationClient.username;
        data.from = sourceClient.username;

        // Emit to specific client only
        io.to(destinationClient.id).emit('direct-chat', data);
    });

    // Broadcast a user has left the room
    socket.on('leave-room', data => {
        let user = {user: undefined, username: undefined};
        let remainingUsers = [];
        usersPresentInRoom.forEach(item => {
            if (item.user === data.user) {
                user.user = item.user;
                user.username = item.username;
            } else {
                remainingUsers.push(item);
            }
        });
        usersPresentInRoom = remainingUsers;
        io.emit('message', {type: "exit", message: `${user.username} has left the room`});
    });

    // Starts a polling session
    socket.on('poll', data => {
        if (!voting) {
            voting = true;
            io.emit('vote', data);
        }
    });

    // Handles the response for polls
    socket.on('poll-response', data => {
        voteTotal++;

        // Notify voters
        let res = { type: 'notice', message: `${data.user} has voted`, username: data.user }
        io.emit('message', res);
        votes.push(data.answer);

        // Are we done voting?
        let totalCanVote = io.engine.clientsCount;
        if (totalCanVote === voteTotal) {
            voting = false;
            let yes = 0;
            let no = 0;
            let incorrectAnswer = 0;
            votes.forEach((item, index) => {
                if (item.toLowerCase() === 'y' || item.toLowerCase() === 'yes') {
                    yes++;
                } else if (item.toLowerCase() === "n" || item.toLowerCase() === "no") {
                    no++;
                } else {
                    incorrectAnswer++;
                }
            });

            // Reset the votes for the next round of voting
            votes = [];
            voteTotal = 0;

            // Notify users of results
            const msg = { type: 'polled', message: `Poll results are: \nyes: ${yes}\nno: ${no}\ninvalid answer: ${incorrectAnswer}` }
            io.emit('message', msg);
        }
    });
});