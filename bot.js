const auth = require('./auth.json');
const config = require('./config.json');
const packageInfo = require('./package.json');
const Discord = require('discord.js');
const TeamspeakClient = require('node-teamspeak');

const client = new Discord.Client();
let teamspeakClient;
const targetChannel = [];

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

    if (response.indexOf('Jörgn') > -1) {
        response = 'Jörgn ist mein Meister';
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
                targetChannel.push(channel);
                channel.send(`Ein wilder Blechadler ist erschienen ${getEmoji(guild, 'adlerkopp')}`);
                console.log('found target channel', channel.id);
            }
        });
    });
    if (targetChannel.length === 0) {
        console.log('no target channel found');
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

    teamspeakClient.on('connect', () => {
        teamspeakClient.send('login', {client_login_name: auth.serverquery.username, client_login_password: auth.serverquery.password}, (err, response) => {
            if (err) {
                console.log('failed to login into ts query', err);
            }

            teamspeakClient.send('use', {sid: config.teamspeak.sid}, (err, response) => {
                if (err) {
                    console.log('failed to select virtual server', err);
                } else {
                    teamspeakClient.send('servernotifyregister', {event: 'server'}, (err, response) => {
                        console.log('connected and logged into ts query');
                        sendPing();
                    });
                }
            });
        });
    });

    teamspeakClient.on('close', () => {
        console.log('auto reconnecting to teamspeak server query');
        setTimeout(setupTeamspeakQuery, 3000);
    });
    teamspeakClient.on('error', () => {
        console.log('auto reconnecting to teamspeak server query');
        setTimeout(setupTeamspeakQuery, 3000);
    });

    teamspeakClient.on('cliententerview', response => {
        if (response.client_type === 0) {
            broadcastMessage(`\`${response.client_nickname}\` hat das Teamspeak betreten`);
            teamspeakClient.send('clientinfo', {clid: response.clid}, (err, clientData) => {
                activeUsers[response.clid.toString()] = clientData.client_nickname;
                if (isNewUser(clientData.client_created)) {
                    broadcastMessage(`@here \`${response.client_nickname}\` ist neu. Will ihm jemand weiterhelfen? 🌵`);
                }
            });
        }
    });

    teamspeakClient.on('clientleftview', response => {
        if (activeUsers[response.clid.toString()]) {
            const username = activeUsers[response.clid.toString()];
            delete activeUsers[response.clid.toString()];
            broadcastMessage(`\`${username}\` hat das Teamspeak verlassen 🚪`);
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
}

/**
 * Sends the teamspeak client list to the message origin channel
 * @param message
 */
function sendClientList(message) {
    if (config.teamspeak.noticesTargetChannel.indexOf(message.channel.name) === -1) {
        message.channel.send(`Du bist leider im falschen Channel dafür ☹`);
        console.log('ts command issued from non permitted channel');
        return;
    }

    teamspeakClient.send('clientlist', {'-away': '', '-info': '', '-times': ''}, (err, response) => {
        if (err) {
            console.log(err);
            message.channel.send(`Da ist leider was schiefgegangen. Bitte sei mir nicht böse ☹`);
            return;
        }

        if (!Array.isArray(response)) {
            response = [response];
        }

        let formattedResponse = '';
        response.forEach(current => {
            // Filter out server query clients
            if (current.client_type !== 1) {
                formattedResponse += current.client_nickname;
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

        if (formattedResponse === '') {
            formattedResponse = `Keiner online ☹`;
        }
        message.channel.send(formattedResponse, {code: true, split: true});
    });
}

/**
 * Broadcasts a message to all channels teamspeak notices should be posted in
 * @param message
 * @param options
 */
function broadcastMessage(message, options) {
    targetChannel.forEach(channel => {
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
