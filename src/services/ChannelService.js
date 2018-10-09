const config = require('../../config/config.json');
const auth = require('../../config/auth.json');
const Discord = require('discord.js');
const Utils = require('./Utils');


module.exports = class ChannelService {

    constructor (client) {
        this.discordClient = client;
    }

    getCategory(message) {
        return message.guild.channels
            .find(c => (c.type == 'category' && c.name.match(new RegExp(config.channel.category,'i'))));
    }

    getCategoryChannels(message) {
        return this.getCategory(message).children.array();
    }

    findChannel(message, channelName) {

        if (channelName.match(Discord.MessageMentions.CHANNELS_PATTERN)) {
            let channel = message.mentions.channels.first();
            
            // this is not a channel of the allowed category
            if (channel.parentID != this.getCategory(message).id) {
                return null;
            }

            return message.mentions.channels.first();
        }

        return this.getCategoryChannels(message).find(c => c.name == channelName);
    }

    /**
     * Sends the teamspeak client list to the message origin channel
     * @param message
     */
    sendChannelOverview(message) {
        let channelCat = this.getCategory(message);
        let channels = this.getCategoryChannels(message);

        let messageText =  `${message.author} hier hast du eine Übersicht aller ${channelCat.name} Channels:\n`;
        for (let i = 0; i < channels.length; i++) {
            const channel = channels[i];

            messageText = messageText.concat(`${channel}${channel.topic != ''?':':''} ${channel.topic}\n`);

        }
        message.channel.send(messageText);
    }


    addUserToChannel(user, channelName, message) {
        let channel = this.findChannel(message, channelName);

        if (!channel) {
            message.channel.send(`${user} Ich habe keinen Channel namens _#${channelName}_ gefunden.`);
            return;
        }

        let permissions = {
            'SEND_MESSAGES': true,
            'READ_MESSAGES': true
        };

        channel.overwritePermissions(user, permissions);

        channel.send(`@here Aufgepasst! Der Feind (${message.author}) hört mit!`);
    }

    removeUserFromChannel(user, channelName, message) {

        let channel = this.findChannel(message, channelName);

        if (!channel) {
            message.channel.send(`${user} Ich habe keinen Channel namens _#${channelName}_ gefunden.`);
            return;
        }

        channel.permissionOverwrites.get(user.id).delete();
        
    }

}