const auth = require('./auth.json');
const config = require('./config.json');
const Discord = require('discord.js');
const TeamspeakClient = require('node-teamspeak');

const client = new Discord.Client();
const teamspeakClient = new TeamspeakClient(config.teamspeak.serverip);
const commandChar = '!';
let targetChannel = [];

/*
    Functions
 */
function setupDiscordClient() {
    client.on('ready', () => {
        console.log(`Logged in as ${client.user.tag}!`);
        parseTargetChannel();
    });

    client.on('message', (msg) => {
        if (hasBeenMentionend(msg)) {
            console.log('mention detected');
        } else if (msg.content.startsWith(commandChar)) {
            const rawCommand = msg.content.slice(1, msg.content.length);
            console.log('received command', rawCommand);
            switch (rawCommand) {
                case 'ts': {
                    sendClientList(msg);
                } break;
            }
        }
    });

    client.login(auth.token);
}

function parseTargetChannel() {
    client.guilds.forEach(guild => {
        guild.channels.forEach((value, key) => {
            if (value.name === config.teamspeak.noticesTargetChannel) {
                targetChannel.push(value);
                console.log('found target channel', value.id);
            }
        });
    });
    if (targetChannel.length === 0) {
        console.log('no target channel found');
    }
}

function hasBeenMentionend(message) {
    const result = message.mentions.members.find((value, key) => {
        return value.user.id === client.user.id;
    });
    return result !== undefined && result !== null;
}

function setupTeamspeakQuery() {
    teamspeakClient.send('login', {client_login_name: auth.serverquery.username, client_login_password: auth.serverquery.password}, (err, response) => {
        if (err) {
            console.log('failed to login into ts query', err);
        }

        teamspeakClient.send('use', {sid: config.teamspeak.sid}, (err, response) => {
            if (err) {
                console.log('failed to select virtual server', err);
            } else {
                console.log('connected and logged into ts query');
            }
        });
    });
}

function sendClientList(message) {
    teamspeakClient.send('clientlist', {'-away': '', '-info': '', '-times': ''}, (err, response) => {
        if (err) {
            console.log(err);
            message.channel.send('Da ist leider was schiefgegangen. Bitte sei mir nicht böse :(');
            return;
        }

        let formattedResponse = '';
        response.forEach(current => {
            // Filter out server query clients
            if (current.client_type !== 1) {
                formattedResponse += current.client_nickname
                if (current.client_away) {
                    formattedResponse += ' (AFK)';
                } else {
                    const date = new Date(0,0,0,0,0,0,current.client_idle_time);
                    if (date.getHours() > 0) {
                        formattedResponse += ` (Untätig seit über ${date.getHours()} Stunden)`;
                    }
                }
                formattedResponse += '\n';
            }
        });
        message.channel.send(JSON.stringify(response), {code: 'json'});
        message.channel.send(formattedResponse, {code: true});
    });
}

/*
    Main
 */

setupDiscordClient();
setupTeamspeakQuery();