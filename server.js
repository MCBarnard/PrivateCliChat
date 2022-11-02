const express = require("express");
const app = express();
const server = require("http").createServer(app);
const io = require("socket.io")(server);
const Auth = require("./ClientAuth.json");

// Listen on port 11111
const PORT = process.env.PORT || 11111;
server.listen(PORT, () => {
    console.log(`server running at http://0.0.0.0:${PORT}`);
});

let voting = false;
let voteTotal = 0;
let votes = [];
const allow_anonymous_connections = Auth.allow_unauthorized_connections;

io.use((socket, next) => {
    const user = socket.handshake.auth.user;
    const secret = socket.handshake.auth.secret;
    const validCredentials = Auth.clients[user] !== undefined && Auth.clients[user].secret === secret;
    if (validCredentials || allow_anonymous_connections) {
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

    socket.on('poll', data => {
        if (!voting) {
            voting = true;
            io.emit('vote', data);
        }
    });

    socket.on('poll-response', data => {
        voteTotal++;

        // Notify voters
        let res = { type: 'notice', message: `${data.user} has voted`, username: data.user }
        io.emit('message', res);
        votes.push(data.answer);

        // Complete voting?
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
            votes = [];
            voteTotal = 0;
            const msg = { type: 'polled', message: `Poll results are: \nyes: ${yes}\nno: ${no}\ninvalid answer: ${incorrectAnswer}` }
            console.log(votes)
            console.log(msg)
            io.emit('message', msg);
        } else {
            console.log((totalCanVote - voteTotal) + " still have to vote")
        }
    });
});