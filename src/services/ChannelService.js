const config = require('../../config/config.json');
const auth = require('../../config/auth.json');
const Discord = require('discord.js');
const Utils = require('./Utils');


module.exports = class ChannelService {

    constructor (client) {
        this.discordClient = client;
    }

    
    /**
     * Find the first category that matches the category name in config
     * @param {Discord.Message} message 
     * @returns {Discord.CategoryChannel} The category channel
     */
    getCategory(message) {
        return message.guild.channels
            .find(c => (c.type == 'category' && c.name.match(new RegExp(config.channel.category,'i'))));
    }
 
    /**
     * Find all channels of category from config
     * @param {Discord.Message} message 
     * @returns {Discord.Channel []}
     */
    getCategoryChannels(message) {
        return this.getCategory(message).children.array();
    }

    /**
     * Get channel from message / either name or mention
     * @param {Discord.Message} message 
     * @returns {Discord.Channel []}
     */
    findChannel(message, channelName) {

        // channelname is a mention
        if (channelName.match(Discord.MessageMentions.CHANNELS_PATTERN)) {
            let channel = message.mentions.channels.first();
            
            if (!channel) {
                return null;
            }

            // mentioned is not a channel of the allowed category
            if (channel.parentID != this.getCategory(message).id) {
                return null;
            }

            return channel;
        }

        return this.getCategoryChannels(message).find(c => c.name == channelName);
    }


    /**
     * Sends the channel list to the message origin channel
     * @param {Discord.Message} message
     */
    sendChannelOverview(message) {
        let channelCat = this.getCategory(message);
        let channels = this.getCategoryChannels(message);

        let messageText =  `${message.author} hier hast du eine Übersicht aller ${channelCat.name} Channels:\n`;
        for (let i = 0; i < channels.length; i++) {
            const channel = channels[i];

            messageText = messageText.concat(`${channel}${channel.topic && channel.topic != ''?':':''} ${channel.topic || ''}\n`);

        }
        message.channel.send(messageText);
    }

    /**
     * Sends the channel list to the message origin channel
     * @param {Discord.User} user
     * @param {String} channelname
     * @param {Discord.Message} message
     */
    addUserToChannel(user, channelName, message) {

        let channel = this.findChannel(message, channelName);
        if (!channel) {
            message.channel.send(`${message.author} Ich habe keinen Channel namens _#${channelName}_ gefunden.`);
            return;
        }

        if (! channel.permissionsFor(message.author).has('MANAGE_ROLES_OR_PERMISSIONS')) {
            message.channel.send(`${message.author} Ne das darfst du nicht. Ich hab dich nicht lieb genug.`);

            return;
        }

        channel.overwritePermissions(user, {
            'SEND_MESSAGES': true,
            'READ_MESSAGES': true
        });

        channel.send(`@here Aufgepasst! Der Feind (${user}) hört mit!`);
    }

    /**
     * Remove given user from given channel 
     * @param {Discord.User} user
     * @param {String} channelname
     * @param {Discord.Message} message
     */
    removeUserFromChannel(user, channelName, message) {

        let channel = this.findChannel(message, channelName);
        if (!channel) {
            message.channel.send(`${message.author} Ich habe keinen Channel namens _#${channelName}_ gefunden.`);
            return;
        }

        // make sure user is permitted
        if (! channel.permissionsFor(message.author).has('MANAGE_ROLES_OR_PERMISSIONS')) { 
            message.channel.send(`${message.author} Ne das darfst du nicht. Ich hab dich nicht lieb genug.`);

            return;
        }

        channel.overwritePermissions(user, {
            'SEND_MESSAGES': null,
            'READ_MESSAGES': null
        });

    }

}