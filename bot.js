const auth = require('./auth.json');
const config = require('./config.json');
const Discord = require('discord.js');
const TeamspeakClient = require('node-teamspeak');

const client = new Discord.Client();
const teamspeakClient = new TeamspeakClient(config.teamspeak.serverip);
const commandChar = '!';
const targetChannel = [];

/*
    Functions
 */
function setupDiscordClient(callback) {
    client.on('ready', () => {
        console.log(`Logged in as ${client.user.tag}!`);
        parseTargetChannel();
        callback();
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
                const channel = new Discord.TextChannel(guild, value);
                targetChannel.push(channel);
                channel.send('Ein wilder Blechadler ist erschienen');
                console.log('found target channel', channel.id);
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

function setupTeamspeakQuery(callback) {
    teamspeakClient.send('login', {client_login_name: auth.serverquery.username, client_login_password: auth.serverquery.password}, (err, response) => {
        if (err) {
            console.log('failed to login into ts query', err);
        }

        teamspeakClient.send('use', {sid: config.teamspeak.sid}, (err, response) => {
            if (err) {
                console.log('failed to select virtual server', err);
            } else {
                console.log('connected and logged into ts query');
                callback();
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

        if (!Array.isArray(response)) {
            response = [response];
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

        if (formattedResponse === '') {
            formattedResponse = 'Keiner online :(';
        }
        message.channel.send(formattedResponse, {code: true});
    });
}

function checkForNewClients() {
    const registeredNewClients = [];

    function checkInternal() {
        teamspeakClient.send('clientlist', {'-away': '', '-info': '', '-times': ''}, (err, response) => {
            if (err) {
                console.log(err);
                return;
            }

            if (!Array.isArray(response)) {
                response = [response];
            }

            response.forEach(current => {
                // Filter out server query clients
                if (current.client_type !== 1 && isNewUser(current.client_database_id, current.client_created)) {
                    registeredNewClients.push(current.client_database_id);
                    const message = `@here \`${current.client_nickname}\` ist neu. Will ihm jemand weiterhelfen?`;
                    targetChannel.forEach(channel => {
                        channel.send(message);
                    });
                    console.log('new user', current.client_database_id);
                }
            });
        });

        setTimeout(checkInternal, 5000);
    }

    function isNewUser(userId, unixTimestamp) {
        if (registeredNewClients.indexOf(userId) === -1) {
            const date = new Date(unixTimestamp*1000);
            const now = new Date();
            const dif = now.getTime() - date.getTime();
            console.log('dif', dif);
            return dif < 8000;
        }
        return false;
    }

    checkInternal();
}

/*
    Main
 */
setupDiscordClient(() => {
    setupTeamspeakQuery(() => {
        checkForNewClients();
    });
});

