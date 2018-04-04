const auth = require('../config/auth.json');
const config = require('../config/config.json');
const packageInfo = require('../package.json');
const Discord = require('discord.js');
const TeamspeakClient = require('node-teamspeak');
const Gamedig = require('gamedig');

const client = new Discord.Client();
let teamspeakClient;
const targetChannelTs = [];
const targetChannelArma = [];
let serverDown = false;
let playersOnServer = [];
const serverReconnectionAttempts = 3;
let reconnectionAttemptCount = 0;
let latestServerState = null;

/*
    Functions
 */
/**
 * Setups the discord client
 */
function setupDiscordClient() {
    client.on('ready', () => {
        console.log(`Logged in as ${client.user.tag}!`);
        parseTargetChannel();
    });

    client.on('message', (message) => {
        if (hasBeenMentionend(message)) {
            parseMention(message);
        } else if (message.content.startsWith(config.commandSymbol)) {
            parseCommand(message);
        }
    });

    client.login(auth.token);
}

/**
 * Called when bot was mentioned
 * @param message
 */
function parseMention(message) {
    const mentionEnd = message.content.indexOf('>') + 2;
    let parsedMessage = message.content.substr(mentionEnd, message.content.length - mentionEnd);
    // Remove all spaces in the beginning
    while (parsedMessage.startsWith(' ')) {
        parsedMessage = parsedMessage.substr(0, 1);
    }

    let response = '';

    switch (parsedMessage) {
        case 'über':
        case 'help':
        case '': {
            response = `Ich bin der Blechadler, eine Kombination aus Adler, Blech und Strom ${getEmoji(message.guild, 'adlerkopp')}`;
        } break;

        case 'version': {
            response = `${packageInfo.name} Version ${packageInfo.version}`;
        } break;

        case 'ts': {
            sendClientList(message);
            return;
        }

        case 'server': {
            sendArmaServerStatus(message);
            return;
        }
    }

    if (parsedMessage.endsWith('?')) {
        const random = Math.random();
        let source;
        if (random > 0.6) {
            source = config.questioning.noAnswers;
        } else if (random < 0.4) {
            source = config.questioning.yesAnswers;
        } else {
            source = config.questioning.otherAnswers;
        }

        response = source[Math.floor(Math.random() * source.length)];
    }

    if (response === '') {
        response = `Machst du mich extra von der Seite an? 💩`;
    }

    message.channel.send(response);
}

/**
 * Called when a message starting with the command symbol was written
 * @param message
 */
function parseCommand(message) {
    const command = message.content.slice(1, message.content.length);
    switch (command) {
        case 'ts': {
            sendClientList(message);
        } break;

        case 'server': {
            sendArmaServerStatus(message);
        } break;
    }
}

/**
 * Searches in all guilds for channels teamspeak notices should be posted in
 */
function parseTargetChannel() {
    client.guilds.forEach(guild => {
        guild.channels.forEach((value, key) => {
            if (config.teamspeak.noticesTargetChannel.indexOf(value.name) > -1) {
                const channel = new Discord.TextChannel(guild, value);
                targetChannelTs.push(channel);
                channel.send(`Ein wilder Blechadler ist erschienen ${getEmoji(guild, 'adlerkopp')}`);
                console.log('found ts target channel', channel.id);
            }
            if (config.armaServer.noticesTargetChannel.indexOf(value.name) > -1) {
                const channel = new Discord.TextChannel(guild, value);
                targetChannelArma.push(channel);
                channel.send(`Ein wilder Blechadler ist erschienen ${getEmoji(guild, 'adlerkopp')}`);
                console.log('found arma target channel', channel.id);
            }
        });
    });
    if (targetChannelTs.length === 0) {
        console.log('no ts target channel found');
    }
    if (targetChannelArma.length === 0) {
        console.log('no arma target channel found');
    }
}

/**
 * Checks if the bot has been mentioned
 * @param message
 * @returns {boolean}
 */
function hasBeenMentionend(message) {
    if (!message.mentions || !message.mentions.members) {
        return false;
    }

    const result = message.mentions.members.find((value, key) => {
        return value.user.id === client.user.id;
    });
    return result !== undefined && result !== null;
}

/**
 * Setups a teamspeak client, connects to the specified server query and reconnects if connection has been lost
 */
function setupTeamspeakQuery() {
    teamspeakClient = new TeamspeakClient(config.teamspeak.serverip, config.teamspeak.queryport);
    const activeUsers = {};

    /*
     * Handles successful server query connections
     * Logs into server query with provided credentials and selects the target virtual server
     * Registers a server notify event to catch joining/leaving users
     */
    teamspeakClient.on('connect', () => {
        teamspeakClient.send('login', {client_login_name: auth.serverquery.username, client_login_password: auth.serverquery.password}, (err, response) => {
            if (err) {
                console.log('failed to login into ts query', err);
                return;
            }

            teamspeakClient.send('use', {sid: config.teamspeak.sid}, (err, response) => {
                if (err) {
                    console.log('failed to select virtual server', err);
                } else {
                    teamspeakClient.send('servernotifyregister', {event: 'server'}, (err, response) => {
                        console.log('connected and logged into ts query');
                        sendPing();
                        cacheClients();
                    });
                }
            });
        });
    });

    /*
     * Handles when the server query connection has been closed
     * Provides an auto reconnect
     */
    teamspeakClient.on('close', () => {
        console.log('auto reconnecting to teamspeak server query');
        setTimeout(setupTeamspeakQuery, 3000);
    });
    /*
     * Handles when the server query connection has failed
     * Provides an auto reconnect
     */
    teamspeakClient.on('error', () => {
        console.log('auto reconnecting to teamspeak server query');
        setTimeout(setupTeamspeakQuery, 3000);
    });

    /*
     * Called when a client enters teamspeak
     */
    teamspeakClient.on('cliententerview', response => {
        if (response.client_type === 0) {
            broadcastTsMessage(`➡️  **${response.client_nickname}** joined`);
            teamspeakClient.send('clientinfo', {clid: response.clid}, (err, clientData) => {
                activeUsers[response.clid.toString()] = clientData.client_nickname;
                if (isNewUser(clientData.client_created)) {
                    broadcastTsMessage(`@here \`${response.client_nickname}\` ist neu`);
                }
            });
        }
    });

    /*
     * Called when a client leaves teamspeak
     */
    teamspeakClient.on('clientleftview', response => {
        if (activeUsers[response.clid.toString()]) {
            const username = activeUsers[response.clid.toString()];
            delete activeUsers[response.clid.toString()];
            broadcastTsMessage(`⬅️  **${username}** left`);
        }
    });

    /**
     * Compares a past unix timestamp with the current time and returns the difference in milliseconds
     * @param unixTimestamp
     * @returns {boolean}
     */
    function isNewUser(unixTimestamp) {
        const date = new Date(unixTimestamp*1000);
        const now = new Date();
        const dif = now.getTime() - date.getTime();
        return dif < 3000;
    }

    /**
     * Sends a ping to the server query to prevent a timeout after 10 minutes idling
     */
    function sendPing() {
        teamspeakClient.send('version', () => {
            console.log('ts query ping');
            setTimeout(sendPing, 60000);
        });
    }

    /**
     * Caches all clients on startup to provide a working disconnect notify logic even if the user was already connected
     */
    function cacheClients() {
        teamspeakClient.send('clientlist', {'-info': ''}, (err, response) => {
            if (err) {
                console.log(err);
                return;
            }

            if (!Array.isArray(response)) {
                response = [response];
            }

            response.forEach(current => {
                // Filter out server query clients
                if (current.client_type !== 1) {
                    activeUsers[current.clid.toString()] = current.client_nickname;
                }
            });
        });
    }
}

/**
 * Sends the teamspeak client list to the message origin channel
 * @param message
 */
function sendClientList(message) {
    if (config.teamspeak.noticesTargetChannel.indexOf(message.channel.name) === -1) {
        message.channel.send(`Du bist leider im falschen Channel dafür ☹`);
        return;
    }

    teamspeakClient.send('channellist', (err, channel) => {
        if (!Array.isArray(channel)) {
            channel = [channel];
        }

        teamspeakClient.send('clientlist', {'-times': ''}, (err, clients) => {
            if (!Array.isArray(clients)) {
                clients = [clients];
            }

            let clientCount = 0;
            clients.forEach(client => {
                const targetChannel = channel.find(x => x.cid === client.cid);
                if (client.client_type === 0 && targetChannel) {
                    targetChannel.clients = targetChannel.clients || [];
                    targetChannel.clients.push(client);
                    clientCount++;
                }
            });

            if (clientCount === 0) {
                message.channel.send('Keiner online');
                return;
            }

            let response  = '▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n';
            response += `**Benutzer online:** ${clientCount}\n\n`;

            channel.forEach(channel => {
                channel.clients = channel.clients || [];
                if (channel.clients.length > 0) {
                    response += `**${channel.channel_name}** (${channel.clients.length}):\n`;
                    channel.clients.forEach(x => {
                        const date = new Date(0, 0, 0, 0, 0, 0, x.client_idle_time);
                        if (date.getHours() > 0) {
                            response += `🔸 `;
                        } else {
                            response += `🔹 `;
                        }
                        response += `\t${x.client_nickname}`;
                        if (date.getHours() > 0) {
                            response += ` (Idle: ${date.getHours()}h)`;
                        }
                        response += '\n';
                    });
                    response += '\n';
                }
            });
            // This is a weird discord newline behaviour workaround, just ignore it
            response = response.substring(0, response.length - 2);
            response += '\n▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬';
            message.channel.send(response);
        });
    });
}

function queryArmaServerStatus(port = 2302, cb) {
    config.armaServer.type = 'arma3';
    config.armaServer.port = port;
    Gamedig.query(config.armaServer).then(state => cb(null, state)).catch(error => cb(error));
}

function sendArmaServerStatus(message) {
    if (latestServerState) {
        let tmpMessage = '';
        tmpMessage = `**Server:** ${latestServerState.name}\n`;
        tmpMessage += `**Karte:** ${latestServerState.map} | **Mission:** ${latestServerState.raw.game} | **Spieler:** ${latestServerState.players.length}/${latestServerState.maxplayers}\n`;
        latestServerState.players.forEach(player => {
            tmpMessage += `\t- ${player.name}\n`;
        });

        message.channel.send(tmpMessage);
    } else {
        message.channel.send(`Server arma.gruppe-adler.de:2302 ist offline.`);
    }
}

function monitorArmaServerStatus() {
    function recurse() {
        queryArmaServerStatus(2302, (error, status) => {
            setTimeout(recurse, 10000);

            if (error) {
                reconnectionAttemptCount++;
                latestServerState = null;
                if (!serverDown && serverReconnectionAttempts >= reconnectionAttemptCount) {
                    broadcastArmaMessage(`Server ${config.armaServer.host}:2302 ist offline.`);
                    serverDown = true;
                    playersOnServer = [];
                    reconnectionAttemptCount = 0;
                }
                console.log(error);
                return;
            }
            latestServerState = status;

            if (serverDown) {
                serverDown = false;
                broadcastArmaMessage(`Server ${config.armaServer.host}:2302 ist online.`);
            }
            const playerNames = status.players.map(player => {
                return player.name;
            });
            playerNames.forEach(name => {
                if (playersOnServer.indexOf(name) === -1) {
                    playersOnServer.push(name);
                    broadcastArmaMessage(`${name} hat den Server 2302 betreten`);
                }
            });

            playersOnServer.forEach(player => {
                const index = playerNames.indexOf(player);
                if (index === -1) {
                    playersOnServer.splice(index, 1);
                    broadcastArmaMessage(`${player} hat den Server 2302 verlassen`);
                }
            });
        });
    }
    recurse();
}

/**
 * Broadcasts a message to all channels teamspeak notices should be posted in
 * @param message
 * @param options
 */
function broadcastTsMessage(message, options) {
    targetChannelTs.forEach(channel => {
        channel.send(message, options);
    });
}

/**
 * Broadcasts a message to all channels arma notices should be posted in
 * @param message
 * @param options
 */
function broadcastArmaMessage(message, options) {
    targetChannelArma.forEach(channel => {
        channel.send(message, options);
    });
}

/**
 * Gets the emoji associated with name
 * @param guild
 * @param name
 * @returns {Emoji}
 */
function getEmoji(guild, name) {
    return guild.emojis.find('name', name);
}

/*
    Init
 */
setupDiscordClient();
setupTeamspeakQuery();
monitorArmaServerStatus();
