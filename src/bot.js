const auth = require('../config/auth.json');
const config = require('../config/config.json');
const packageInfo = require('../package.json');
const Discord = require('discord.js');
const TeamspeakService = require('./services/TeamspeakService');
const StricheService = require('./services/StricheService');
const Utils = require('./services/Utils');
const Gamedig = require('gamedig');

const client = new Discord.Client();
let tsService = null;
let stricheService = null;
/*
    Functions
 */
/**
 * Setups the discord client
 */
function setupDiscordClient() {
    client.on('ready', () => {
        console.log(`Logged in as ${client.user.tag}!`);
        //parseTargetChannel();
        tsService = new TeamspeakService(client);
        stricheService = new StricheService(client);
    }, (err) => console.log(err));

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

    //remove blechadler mention 
    const mentionEnd = message.content.indexOf('>') + 2;
    let parsedMessage = message.content.substr(mentionEnd, message.content.length - mentionEnd);
    
    // Remove all spaces in the beginning
    while (parsedMessage.startsWith(' ')) {
        parsedMessage = parsedMessage.substr(0, 1);
    }
    
    switch (parsedMessage.toLowerCase()) {
        case 'über':
        case 'help':
        case '': {
            message.channel.send(`Ich bin der Blechadler, eine Kombination aus Adler, Blech und Strom ${Utils.getEmoji(message.guild, 'adlerkopp')}`);
            return;
        } break;

        case 'version': {
            message.channel.send(`${packageInfo.name} Version ${packageInfo.version}`);
            return;
        } break;

        case 'ts': {
            tsService.sendClientList(message);
            return;
        }

        case 'server': {
            sendArmaServerStatus(message);
            return;
        }
        case 'striche': {
            stricheService.sendStricheOverview(message);
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

        message.channel.send(source[Math.floor(Math.random() * source.length)]);
        return;
    }


    if (parsedMessage.toLowerCase().startsWith('strich ')) {

        let user = message.mentions.users.find(user => (user.id != client.user.id));
        let reason = parsedMessage.replace(`strich <@${user.id}>`, '');
        while (reason.startsWith(' ')) {
            reason = reason.substr(0, 1);
        }

        stricheService.addStrich(message, user, reason);

        return;
    }

    if (parsedMessage.toLowerCase().startsWith('striche ')) {
        let user = message.mentions.users.find(user => (user.id != client.user.id));
        stricheService.sendUserStriche(message, user);

        return;
    }

    message.channel.send(`Machst du mich extra von der Seite an? 💩`);
}

/**
 * Called when a message starting with the command symbol was written
 * @param message
 */
function parseCommand(message) {
    const command = message.content.slice(1, message.content.length);
    switch (command) {
        case 'ts': {
            tsService.sendClientList(message);
        } break;

        case 'server': {
            sendArmaServerStatus(message);
        } break;
    }
}


/**
 * Checks if the bot has been mentioned
 * @param message
 * @returns {boolean}
 */
function hasBeenMentionend(message) {
    if (!message.mentions || !message.mentions.members || message.author.id == client.user.id) {
        return false;
    }

    const result = message.mentions.members.find((value, key) => {
        return value.user.id === client.user.id;
    });
    return result !== undefined && result !== null;
}

/*
    Init
 */
setupDiscordClient();
// monitorArmaServerStatus();
