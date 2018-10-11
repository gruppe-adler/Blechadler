const Discord = require('discord.js');

module.exports = (discordClient, message, args, services) => {

    if (! args[0].match(Discord.MessageMentions.USERS_PATTERN)) {
        //TODO: send help message
        return;
    }

    // find user from first mention
    // we need this id because we want to get the user, which was mention directly after the 'strich '
    let userid = args.shift().replace(/^<@!?/i, '').replace(/>.*$/i, '');
    let user = message.mentions.users.find(user => (user.id == userid));

    if (!user) {
        message.channel.send(`${message.author} Ich habe den Member leider nicht gefunden.`);
        services.help.sendCommand(message, "strich");
        return;
    }

    let reason = args.join(' ');

    services.striche.addStrich(message, user, reason);

    return true;
}