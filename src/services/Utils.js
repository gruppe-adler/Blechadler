module.exports = class Utils {

    /**
     * Gets the emoji associated with name
     * @param guild
     * @param name
     * @returns {Emoji}
     */
    static getEmoji(guild, name) {
        return guild.emojis.find('name', name) || `:${name}:`;
    }    
}