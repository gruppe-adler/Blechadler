const Discord = require('discord.js');

module.exports = (discordClient, message, args, services) => {

    if (args.length < 2) {
        services.channel.sendChannelOverview(message);
        return;
    }

    // CHANNEL JOIN
    if (args[0].match(/^(join|add|enter|beitreten)$/i)) {
        // remove sub command
        args.shift();

        // make sure arg matches either channel-mention or stats with #
        if(! args[0].match(Discord.MessageMentions.CHANNELS_PATTERN) && ! args[0].match(/^#.+&/i)) {
            message.channel.send(`${message.author} _${Discord.escapeMarkdown(args[0])}_ ist kein Channel.`)
            services.help.sendCommand(message, "channel add");
            return;
        }

        let channel = args.shift().replace(/^#/i, '');
        let user = message.author;

        // if author wants to add other user
        if (args.length > 0 && message.mentions.users.size > 1) {
            user = message.mentions.users.find(x => x.id != discordClient.id);
        }

        services.channel.addUserToChannel(user, channel, message);

        return;
    }

    // CHANNNEL LEAVE
    if (args[0].match(/^(leave|remove|exit|verlassen)$/i)) {
        // remove sub command
        args.shift();

        // make sure arg matches either channel-mention or stats with #
        if(! args[0].match(Discord.MessageMentions.CHANNELS_PATTERN) && ! args[0].match(/^#.+&/i)) {
            message.channel.send(`${message.author} _${Discord.escapeMarkdown(args[0])}_ ist kein Channel.`)
            services.help.sendCommand(message, "channel remove");
            return;
        }

        let channel = args.shift().replace(/^#/i, '');
        let user = message.author;

        // if author wants to add other user
        if (args.length > 0 && message.mentions.users.size > 1) {
            user = message.mentions.users.find(x => x.id != discordClient.id);
        }

        services.channel.removeUserFromChannel(user, channel, message);

        return;
    }

    services.channel.sendChannelOverview(message);
}