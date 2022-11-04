import { createRequire } from "module";
const require = createRequire(import.meta.url);
const readline = require('readline');
import { io } from "socket.io-client";
import chalk from 'chalk';
import figlet from "figlet";
import gradient from "gradient-string";
const player = require("play-sound")({});
const config = require('../config/config.json');
const theme = require('../config/Theme.json');

let username = config.authorization.handle;
const productionMode = config.environment === 'prod';
let host = productionMode ? config.live_url: config.local_url;

// Connect to server
const socket = io(host, {
    auth: {
        user: config.authorization.user,
        username: username,
        secret: config.authorization.secret
    }
});

let bannerText = config["chat-name"];

socket.on("connect_error", (err) => {
    console.log(`\nConnection Error: ${err.message}`);
    process.exit();
});

console.clear();
printFiglitText(bannerText);


// Start interaction
let rl;
// Wait for figlifying text
await setTimeout(() => {
    console_out(gradient.rainbow.multiline(bannerText));
    console_out(gradient.atlas.multiline("Type /help for more assistance..."));
}, 1000);


// Start interaction
rl = readline.createInterface(process.stdin, process.stdout);
rl.prompt(true);

// This keeps the chat line open and ready (the secret sauce of the chat app)
rl.on('line', line => {
    if (line[0] === "/" && line.length > 1) {
        const cmd = line.match(/[a-z]+\b/)[0];
        const arg = line.substr(cmd.length+2, line.length);
        chat_command(cmd, arg);

    } else {
        // send chat message
        socket.emit('send', { type: 'chat', message: line, username: username });
        rl.prompt(true);
    }
});

// Handle a user joined the room
socket.on('joined-the-room', data => {
    const msg = color(`${data}`, theme["user-joined"]);
    console_out(msg);
    playPing();
});

// Handle a direct message from someone
socket.on('direct-chat', data => {
    let leader = color("["+data.from+"->"+data.to+"]", theme["direct-message"]);
    console_out(leader + data.message);
    playPing();
});

// Client received a message
socket.on('message', function (data) {
    let leader;
    if (data.type === 'chat' && data.username !== username) {
        leader = color("<"+data.username+"> ", theme["user"]);
        console_out(leader + data.message);
        playPing();
    }
    else if (data.type === "exit") {
        console_out(color(data.message, theme["user-left"]));
    }
    else if (data.type === "help") {
        console_out(color(data.message, theme["help"]));
    }
    else if (data.type === "notice") {
        console_out(color(data.message, theme["notice"]));
        playPing();
    }
    // else if (data.type === "tell" && data.to === username) {
    else if (data.type === "tell") {
        leader = color("["+data.from+"->"+data.to+"]", theme["direct-message"]);
        console_out(leader + data.message);
        playPing();
    }
    else if (data.type === "emote") {
        console_out(gradient.atlas(data.message));
        playPing();
    }
    else if (data.type === "polled") {
        console_out(color(data.message, theme["poll-results"]));
        playPing();
    }
});

socket.on('vote', question => {
    console_out(color("Type y/n", theme["poll-start"]));
    rl.question(question + "   ", answer => {
        socket.emit('poll-response', { question: question, answer: answer, user: username });
        rl.prompt(true);
    });
});

function printFiglitText(text) {
    let font = theme["figlet-font"];
    if (theme["random-theme"]) {
        font = getRandomItem(theme["figlet-font-favorites"]);
    }
    figlet(text, {
        font: font
    }, (err, data) => {
        if (err) {
            console.log('Something went wrong...');
            bannerText = text;
        }
        bannerText = data;
    });
}

function playPing() {
    player.play(`assets/${theme["notification-sound-file"]}`, {}, err => {
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
                console_out(color("The following commands are available:", theme["poll-results"]));
                console_out(color("/nickname name", theme["help-command"]) + color("         This will change your display username", theme["help-description"]));
                console_out(color("/msg Bob Hi Bob", theme["help-command"]) + color("        Sends a message directly to bob", theme["help-description"]));
                console_out(color("/me has done it!", theme["help-command"]) + color("       Broadcasts a special message", theme["help-description"]));
                console_out(color("/vote Shall we do it?", theme["help-command"]) + color("  Starts a poll", theme["help-description"]));
                console_out(color("/clear", theme["help-command"]) + color("                 Clears the console", theme["help-description"]));
                console_out(color("/exit", theme["help-command"]) + color("                  Exits the room", theme["help-description"]));
            break;

        case 'nickname':
            const notice = username + " changed their name to " + arg;
            username = arg;
            socket.emit('send', { type: 'notice', message: notice });
            break;

        case 'msg':
            const to = arg.split(" ")[0];
            const message = arg.substr(to.length, arg.length);
            socket.emit('direct-message', { type: 'tell', message: message, to: to, from: config.authorization.user });
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
            socket.emit('leave-room', {user: config.authorization.user});
            socket.disconnect();
            console_out(color("Bye bye...", theme["user-left"]));
            process.exit();
            break;

        default:
            console_out("That is not a valid command.");

    }
}

function getRandomItem(list) {
    return list[Math.floor(Math.random() * list.length)]
}

function color(text, clr) {
    const textColor = chalk.hex(clr);
    return textColor(text);
}