const auth = require('../config/auth.json');
const config = require('../config/config.json');
const commandAliases = require('../config/command_aliases.json');
const Discord = require('discord.js');
const TeamspeakService = require('./services/TeamspeakService');
const StricheService = require('./services/StricheService');
const ReminderService = require('./services/ReminderService');
const ChannelService = require('./services/ChannelService');
const HelpService = require('./services/HelpService');
const Utils = require('./services/Utils');

const client = new Discord.Client();
let services = {};

/**
 * Setups the discord client
 */
function setupDiscordClient() {
    client.on('ready', () => {
        console.log(`Logged in as ${client.user.tag}!`);
        services.ts = new TeamspeakService(client);
        services.striche = new StricheService(client);
        services.reminder = new ReminderService(client);
        services.channel = new ChannelService(client);
        services.help = new HelpService(client);
    }, (err) => console.error('Error creating discord client:', err));

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

    // Remove blechadler mention and trailing spaces in the beginning 
    let parsedMessage = message.content.replace(
        new RegExp(`${client.user}[ ]*`, 'i'),
        ''
    );

    
    
    let args = parsedMessage.trim().split(/ +/g);
    
    let command = args.shift().toLowerCase();
    command = commandAliases[command] || command;
    
    if (config.commands.indexOf(command) == -1) {
        
        // question
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
        
        //TODO: Help
        message.channel.send(`Machst du mich extra von der Seite an? ${Utils.getEmoji(message.guild, 'slade')}`);
        return;
    }
    
    // execute command
    require(`./commands/${command}.js`)(client, message, args, services);
}

/**
 * Called when a message starting with the command symbol was written
 * @param message
 */
function parseCommand(message) {
    const command = message.content.slice(1, message.content.length);
    switch (command) {
        case 'ts': {
            services.ts.sendClientList(message);
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

    //only counts as mentioned if the message starts with the blechadler mention
    return (message.content.match(new RegExp(`^${client.user}`,'i')));
}

/*
    Init
 */
setupDiscordClient();
