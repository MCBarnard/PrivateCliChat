const readline = require('readline');
const { io } = require("socket.io-client");
const color = require("ansi-color").set;
const config = require('./config.json');

const  play = player = require('play-sound')(opts = {});

let username;
const productionMode = config.environment === 'prod';
let host = productionMode ? config.live_url: config.local_url;

// Connect to server
const socket = io(host, {
    auth: {
        user: config.authorization.user,
        secret: config.authorization.secret
    }
});

socket.on("connect_error", (err) => {
    console.log(`\nConnection Error: ${err.message}`);
    process.exit();
});

// Start interaction
const rl = readline.createInterface(process.stdin, process.stdout);
// Set the username
rl.question("Please enter a nickname: ", name => {
    username = name;
    const msg = username + " has joined the chat";
    socket.emit('send', { type: 'notice', message: msg });
    console_out(color("Type /help to get help or send out a message to the world...", "yellow"));
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
        playPing();
    }
    else if (data.type === "exit") {
        console_out(color(data.message, 'red'));
    }
    else if (data.type === "help") {
        console_out(color(data.message, 'white'));
    }
    else if (data.type === "notice") {
        console_out(color(data.message, 'cyan'));
        playPing();
    }
    else if (data.type === "tell" && data.to === username) {
        leader = color("["+data.from+"->"+data.to+"]", "red");
        console_out(leader + data.message);
        playPing();
    }
    else if (data.type === "emote") {
        console_out(color(data.message, "magenta"));
        playPing();
    }
    else if (data.type === "polled") {
        console_out(color(data.message, "yellow"));
        playPing();
    }
});

socket.on('vote', question => {
    console_out(color("Type y/n", "green"));
    rl.question(question + "   ", answer => {
        socket.emit('poll-response', { question: question, answer: answer, user: username });
        rl.prompt(true);
    });
});

function playPing() {
    player.play('ting.wav', {}, function(err){
        if (err) throw err
    });
}

function console_out(msg) {
    process.stdout.clearLine();
    process.stdout.cursorTo(0);
    console.log(msg);
    rl.prompt(true);
}

function chat_command(cmd, arg) {
    switch (cmd) {
        case 'help':
                console_out(color("The following commands are available:", "yellow"));
                console_out(color("/nickname name", "red") + color("         This will change your display username", "green"));
                console_out(color("/msg Bob Hi Bob", "red") + color("        Sends a message directly to bob", "green"));
                console_out(color("/me has done it!", "red") + color("       Broadcasts a special message", "green"));
                console_out(color("/vote Shall we do it?", "red") + color("  Starts a poll", "green"));
                console_out(color("/clear", "red") + color("                 Clears the console", "green"));
                console_out(color("/exit", "red") + color("                  Exits the room", "green"));
            break;

        case 'nickname':
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

        case 'vote':
            socket.emit('poll', arg);
            break;

        case 'clear':
            console.clear();
            chat_command("help", null)
            break;

        case 'exit':
            const exit = username + " has left the room";
            socket.emit('send', { type: 'exit', message: exit });
            socket.disconnect();
            console_out(color("Bye bye...", "red"));
            process.exit();
            break;

        default:
            console_out("That is not a valid command.");

    }
}