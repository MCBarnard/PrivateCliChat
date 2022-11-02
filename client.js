const readline = require('readline');
const { io } = require("socket.io-client");
const util = require('util');
const color = require("ansi-color").set;
const config = require('./config.json');

let username;
const socket = io(config.url);
const rl = readline.createInterface(process.stdin, process.stdout);

// Set the username
rl.question("Please enter a nickname: ", function(name) {
    username = name;
    const msg = username + " has joined the chat";
    socket.emit('send', { type: 'notice', message: msg });
    rl.prompt(true);
});

rl.on('line', function (line) {
    if (line[0] == "/" && line.length > 1) {
        const cmd = line.match(/[a-z]+\b/)[0];
        const arg = line.substr(cmd.length+2, line.length);
        chat_command(cmd, arg);

    } else {
        // send chat message
        socket.emit('send', { type: 'chat', message: line, username: username });
        rl.prompt(true);
    }
});

socket.on('message', function (data) {
    let leader;
    if (data.type === 'chat' && data.username !== username) {
        leader = color("<"+data.username+"> ", "green");
        console_out(leader + data.message);
    }
    else if (data.type === "exit") {
        console_out(color(data.message, 'red'));
    }
    else if (data.type === "help") {
        console_out(color(data.message, 'white'));
    }
    else if (data.type === "notice") {
        console_out(color(data.message, 'cyan'));
    }
    else if (data.type === "tell" && data.to === username) {
        leader = color("["+data.from+"->"+data.to+"]", "red");
        console_out(leader + data.message);
    }
    else if (data.type === "emote") {
        console_out(color(data.message, "cyan"));
    }
});

function console_out(msg) {
    process.stdout.clearLine();
    process.stdout.cursorTo(0);
    console.log(msg);
    rl.prompt(true);
}

function chat_command(cmd, arg) {
    switch (cmd) {

        case 'help':
            const help = "The following commands are available: \n" +
                "/userchange name     This will change your display username" +
                "/msg Bob Hi Bob      Sends a message directly to bob" +
                "/me has done it!     Broadcasts a special message" +
                "/exit                Exits the room";
            username = arg;
            console.log(help);
            // socket.emit('send', { type: 'help', message: help });
            break;

        case 'userchange':
            const notice = username + " changed their name to " + arg;
            username = arg;
            socket.emit('send', { type: 'notice', message: notice });
            break;

        case 'msg':
            const to = arg.match(/[a-z]+\b/)[0];
            const message = arg.substr(to.length, arg.length);
            socket.emit('send', { type: 'tell', message: message, to: to, from: username });
            break;

        case 'me':
            const emote = username + " " + arg;
            socket.emit('send', { type: 'emote', message: emote });
            break;

        case 'exit':
            const exit = username + " has left the room";
            socket.emit('send', { type: 'exit', message: exit });
            socket.disconnect();
            console.log("Bye bye...")
            process.exit();
            break;

        default:
            console_out("That is not a valid command.");

    }
}