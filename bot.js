const auth = require('./auth.json');
const config = require('./config.json');
const packageInfo = require('./package.json');
const Discord = require('discord.js');
const TeamspeakClient = require('node-teamspeak');

const client = new Discord.Client();
const teamspeakClient = new TeamspeakClient(config.teamspeak.serverip, config.teamspeak.queryport);
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

    client.on('message', (message) => {
        if (hasBeenMentionend(message)) {
            parseMention(message);
        } else if (message.content.startsWith(config.commandSymbol)) {
            parseCommand(message);
        }
    });

    client.login(auth.token);
}

function parseMention(message) {
    const mentionEnd = message.content.indexOf('>') + 2;
    let parsedMessage = message.content.substr(mentionEnd, message.content.length - mentionEnd);
    // Remove all spaces in the beginning
    while (parsedMessage.startsWith(' ')) {
        parsedMessage = parsedMessage.substr(0, 1);
    }

    console.log(parsedMessage);
    let response = '';

    switch (parsedMessage) {
        case 'über':
        case 'help':
        case '?':
        case '': {
            response = 'Ich bin der Blechadler, eine Kombination aus Adler, Blech und Strom';
        } break;
    }

    if (parsedMessage.endsWith('?')) {
        const random = Math.random();
        if (random > 0.6) {
            response = 'Definitiv nicht';
        } else if (random < 0.4) {
            response = 'Ich denke schon';
        } else {
            response = 'Geh XiviD fragen';
        }
    }

    if (response === '') {
        response = 'Machst du mich extra von der Seite an?';
    }

    message.channel.send(response);
}

function parseCommand(message) {
    const command = message.content.slice(1, message.content.length);
    switch (command) {
        case 'ts': {
            sendClientList(message);
        } break;
    }
}

function parseTargetChannel() {
    client.guilds.forEach(guild => {
        guild.channels.forEach((value, key) => {
            if (config.teamspeak.noticesTargetChannel.indexOf(value.name) > -1) {
                const channel = new Discord.TextChannel(guild, value);
                targetChannel.push(channel);
                // channel.send('Ein wilder Blechadler ist erschienen');
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
    if (config.teamspeak.noticesTargetChannel.indexOf(message.channel.name) === -1) {
        message.channel.send('Du bist leider im falschen Channel dafür :(');
        console.log('ts command issued from non permitted channel');
        return;
    }

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
    const currentClients = [];
    let isStartup = true;

    function checkInternal() {
        teamspeakClient.send('clientlist', {'-away': '', '-info': '', '-times': ''}, (err, response) => {
            if (err) {
                console.log(err);
                return;
            }

            if (!Array.isArray(response)) {
                response = [response];
            }

            // Filter new clients
            response.forEach(current => {
                // Filter out server query clients
                if (current.client_type !== 1) {
                    if (isNewUser(current.client_database_id, current.client_created)) {
                        registeredNewClients.push(current.client_database_id);
                        broadcastMessage(`@here \`${current.client_nickname}\` ist neu. Will ihm jemand weiterhelfen?`);
                        console.log('new user', current.client_database_id);
                    }

                    if (currentClients.every((value => value.client_database_id !== current.client_database_id))) {
                        currentClients.push(current);
                        console.log('joined', current.client_nickname);
                        if (!isStartup) {
                            broadcastMessage(`\`${current.client_nickname}\` hat das Teamspeak betreten`);
                        }
                    }
                }
            });

            // Filter old clients
            currentClients.filter((value) => response.every(stored => value.client_database_id !== stored.client_database_id)).forEach(current => {
                console.log('left', current.client_nickname);
                currentClients.splice(currentClients.indexOf(current), 1);
                broadcastMessage(`\`${current.client_nickname}\` hat das Teamspeak verlassen`);
            });

            isStartup = false;
        });

        setTimeout(checkInternal, 5000);
    }

    function isNewUser(userId, unixTimestamp) {
        if (registeredNewClients.indexOf(userId) === -1) {
            const date = new Date(unixTimestamp*1000);
            const now = new Date();
            const dif = now.getTime() - date.getTime();
            return dif < 12000;
        }
        return false;
    }

    checkInternal();
}

function broadcastMessage(message, options) {
    targetChannel.forEach(channel => {
        channel.send(message, options);
    });
}

/*
    Main
 */
setupDiscordClient(() => {
    setupTeamspeakQuery(() => {
        checkForNewClients();
    });
});
