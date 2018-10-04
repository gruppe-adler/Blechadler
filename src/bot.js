const auth = require('../config/auth.json');
const config = require('../config/config.json');
const packageInfo = require('../package.json');
const Discord = require('discord.js');
const TeamspeakService = require('./services/TeamspeakService');
const StricheService = require('./services/StricheService');
const ReminderService = require('./services/ReminderService');
const Utils = require('./services/Utils');

const client = new Discord.Client();
let tsService = null;
let stricheService = null;
let reminderService = null;

/**
 * Setups the discord client
 */
function setupDiscordClient() {
    client.on('ready', () => {
        console.log(`Logged in as ${client.user.tag}!`);
        tsService = new TeamspeakService(client);
        stricheService = new StricheService(client);
        reminderService = new ReminderService(client);
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

    // Remove blechadler mention and trailing spaces in the beginning 
    let parsedMessage = message.content.replace(
        new RegExp(`<@!?${client.user.id}>[ ]*`, 'i'),
        ''
    );

    let userMentionPattern = Discord.MessageMentions.USERS_PATTERN.source;
    
    switch (parsedMessage.toLowerCase()) {
        case 'über':
        case 'help':
        case '': {
            message.channel.send(`Ich bin der Blechadler, eine Kombination aus Adler, Blech und Strom ${Utils.getEmoji(message.guild, 'adlerkopp')}`);
            return;
        };

        case 'version': {
            message.channel.send(`${packageInfo.name} Version ${packageInfo.version}`);
            return;
        };

        case 'ts': {
            tsService.sendClientList(message);
            return;
        }

        // case 'server': {
        //     sendArmaServerStatus(message);
        //     return;
        // }
        case 'striche': {
            stricheService.sendStricheOverview(message);
            return;
        }
    }

    // message matches 'strich <mention>.*'
    if (parsedMessage.match(new RegExp(`^strich ${userMentionPattern}.*$`,'i'))) {

        // find user from first mention
        // we need this id because we want to get the user, which was mention directly after the 'strich '
        let userid = parsedMessage.replace(/^strich <@!?/i, '').replace(/>.*$/i, '');
        let user = message.mentions.users.find(user => (user.id == userid));

        let reason = parsedMessage.replace(
            new RegExp(`strich ${userMentionPattern}[ ]*`,'i'),
            ''
        );

        stricheService.addStrich(message, user, reason);

        return;
    }

    // message matches 'striche <mention>'
    if (parsedMessage.match(new RegExp(`^striche ${userMentionPattern}$`,'i'))) {

        let user = message.mentions.users.find(user => (user.id != client.user.id));
        stricheService.sendUserStriche(message, user);

        return;
    }

    // message matches 'pick .+ .+' so pick followed by minimum two options
    if (parsedMessage.match(new RegExp(`pick .+ .+`))) {
        var options = parsedMessage.replace('pick ', '').split(' ');

        let pick = options[Math.floor(Math.random() * options.length)];

        //if there is an a-10 pick the a-10 :P
        if (parsedMessage.match(/a\-?10/i)) {
            pick = options.find(option => option.match(/a\-?10/i));
        }

        message.channel.send(`<@${message.author.id}> Also ich wär für **${pick}**`);
    
        return;
    }

    // message matches 'reminder(er)? <mention>'
    if (parsedMessage.match(new RegExp(`^remind(er)? ${userMentionPattern}$`,'i'))) {

        let user = message.mentions.users.find(user => (user.id != client.user.id));
        reminderService.listReminders(message, user);

        return;
    }

    // message matches 'reminder(er)? delete 1'
    if (parsedMessage.match(new RegExp(`^remind(er)? (delete|remove) [0-9]+$`,'i'))) {

        let reminderId = parsedMessage.replace(/^remind(er)? (delete|remove) /i, '');

        reminderService.deleteReminder(message, reminderId);

        return;
    }

    if (parsedMessage.match(new RegExp(`^remind(er)? .+$`, 'i'))) {

        let authorid = message.author.id;
        let userid = authorid;
        let date = new Date();

        // remove the remind(er) from the beginning
        let tempText = parsedMessage.replace(/^remind(er)? /i, '');

        // if there is a mention parse it out
        if (tempText.match(new RegExp(`^${userMentionPattern} .*`, 'i'))) {
            userid = tempText.replace(/^<@!?/i, '').replace(/>.*$/i, '');
            
            // remove mention
            tempText = tempText.replace(new RegExp(`^${userMentionPattern}[ ]*`, 'i'), '');
        }

        if (tempText.match(/^\d{4}\-\d{2}\-\d{2} \d{2}\:\d{2} .*$/i)) {
            let match = tempText.match(/^\d{4}\-\d{2}\-\d{2} \d{2}\:\d{2}/i)[0];
            date = new Date(match);

            // remove date and time
            tempText = tempText.replace(/^\d{4}\-\d{2}\-\d{2} \d{2}\:\d{2}[ ]*/i, '');

        } else if(tempText.match(/^\d{2}\:\d{2} .*$/i)) {
            let dateString = date.toDateString();
            let match = tempText.match(/^\d{2}\:\d{2}/i)[0];
            
            date = new Date(dateString.concat(' ').concat(match));

            // remove time
            tempText = tempText.replace(/^\d{2}\:\d{2}[ ]*/i, '');

        } else {
            message.channel.send(`<@!${authorid}> Ich kann das nicht lesen. Bitte folgendes Format: \`reminder [@mention] [YYYY-MM-DD] HH:MM <Titel>\``);
            return;
        }


        if (date.getTime() < (new Date()).getTime()) {
            message.channel.send(`Ehh <@!${authorid}> du Held. Ich kann dich schlecht an einem vergangenen Zeitpunkt erinnern. Seh ich wie Marty McFly aus oder was?`);
            return;
        }

        // the rest of the text is the title
        let title = tempText;

        reminderService.addReminder(userid, date, title, authorid, message);
        return;
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

        // case 'server': {
        //     sendArmaServerStatus(message);
        // } break;
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
    return (message.content.match(new RegExp(`^<@!?${client.user.id}>`,'i')));
}

/*
    Init
 */
setupDiscordClient();
