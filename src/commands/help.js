const Utils = require('../services/Utils');

module.exports = (discordClient, message, args, services) => {
    message.channel.send(`Ich bin der Blechadler, eine Kombination aus Adler, Blech und Strom ${Utils.getEmoji(message.guild, 'adlerkopp')}`);
    return;
}